import { App, ItemView, Notice, WorkspaceLeaf } from "obsidian";
import type { Editor } from "grapesjs";
import { VIEW_TYPE_BUILDER, PLUGIN_ICON } from "../constants";
import type { LibraryScanPort, ProjectStore } from "../core/ports";
import type { ProjectData } from "../core/domain/types";
import { dedupeBlocks } from "../core/library/blockFactory";
import {
  createBuilderEditor,
  syncComponentBlocks,
} from "../adapters/editor/grapes";
import { ConsentModal } from "./modals";

/** What the BuilderView needs from the plugin (avoids a circular import). */
export interface BuilderHost {
  app: App;
  projectStore: ProjectStore;
  library: LibraryScanPort;
  autosaveSteps: () => number;
  /** Called after a successful save (e.g. to refresh the Page Index). */
  afterSave: (id: string) => void;
}

interface BuilderState {
  projectId?: string;
}

export class BuilderView extends ItemView {
  private editor: Editor | null = null;
  private projectId: string | null = null;
  private title = "Specorator Builder";
  private blockIds: string[] = [];
  private disposeWatch: (() => void) | null = null;
  private canvasEl: HTMLElement | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private host: BuilderHost
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_BUILDER;
  }

  getDisplayText(): string {
    return this.title;
  }

  getIcon(): string {
    return PLUGIN_ICON;
  }

  getState(): Record<string, unknown> {
    return { projectId: this.projectId ?? undefined };
  }

  async setState(state: BuilderState, result: unknown): Promise<void> {
    const next = state?.projectId ?? null;
    if (next !== this.projectId) {
      this.projectId = next;
      await this.remount();
    }
    await super.setState(state, result as any);
  }

  async onOpen(): Promise<void> {
    this.containerEl.addClass("specorator-builder-view");
    this.renderShell();
    if (this.projectId && !this.editor) await this.mount();
  }

  async onClose(): Promise<void> {
    this.teardown();
  }

  getEditor(): Editor | null {
    return this.editor;
  }

  async reloadLibrary(): Promise<void> {
    await this.refreshBlocks();
  }

  /** Reload project data from disk into the live editor (ADR-0009 conflict model). */
  async reloadFromDisk(): Promise<void> {
    if (!this.editor || !this.projectId) return;
    const dirty =
      (
        this.editor as unknown as { getDirtyCount?: () => number }
      ).getDirtyCount?.() ?? 0;
    if (dirty > 0) {
      new ConsentModal(
        this.app,
        {
          title: "Project changed outside the editor",
          body: "This project was modified (e.g. by an agent) while you have unsaved changes open here. Reload from disk and discard your changes, or keep your version?",
          confirmText: "Reload from disk",
        },
        () => void this.applyDiskData()
      ).open();
      return;
    }
    await this.applyDiskData();
  }

  private async applyDiskData(): Promise<void> {
    if (!this.editor || !this.projectId) return;
    const data = await this.host.projectStore.loadData(this.projectId);
    if (data) {
      this.editor.loadProjectData(
        data as Parameters<Editor["loadProjectData"]>[0]
      );
    }
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  // --- internals -----------------------------------------------------------

  private renderShell(): void {
    const root = this.contentEl;
    root.empty();
    const wrap = root.createDiv({ cls: "sp-editor-root" });
    const toolbar = wrap.createDiv({ cls: "sp-editor-toolbar" });
    toolbar.createSpan({ cls: "sp-title", text: this.title });
    this.canvasEl = wrap.createDiv({ cls: "sp-editor-canvas" });
  }

  private async remount(): Promise<void> {
    this.teardown();
    if (this.canvasEl && this.projectId) await this.mount();
  }

  private async mount(): Promise<void> {
    if (!this.projectId || !this.canvasEl) return;
    const projectId = this.projectId;

    const loaded = await this.host.projectStore.load(projectId);
    if (loaded) {
      this.title = loaded.meta.title;
      const titleEl = this.contentEl.querySelector(".sp-title");
      if (titleEl) titleEl.textContent = this.title;
    }

    const blocks = await this.currentBlocks();
    this.blockIds = blocks.map((b) => b.id);

    this.editor = createBuilderEditor({
      container: this.canvasEl,
      load: () =>
        this.host.projectStore.loadData(projectId) as Promise<ProjectData>,
      store: async (data) => {
        await this.host.projectStore.saveData(projectId, data);
        this.host.afterSave(projectId);
      },
      blocks,
      stepsBeforeSave: this.host.autosaveSteps(),
    });

    this.disposeWatch = this.host.library.onChange(() => {
      void this.refreshBlocks();
    });
  }

  private async currentBlocks() {
    const defs = await this.host.library.scan();
    const { blocks, duplicates } = dedupeBlocks(defs);
    if (duplicates.length) {
      new Notice(
        `Specorator: duplicate component block-id(s) ignored: ${duplicates.join(", ")}`
      );
    }
    return blocks;
  }

  private async refreshBlocks(): Promise<void> {
    if (!this.editor) return;
    const blocks = await this.currentBlocks();
    this.blockIds = syncComponentBlocks(this.editor, blocks, this.blockIds);
  }

  private teardown(): void {
    if (this.disposeWatch) {
      this.disposeWatch();
      this.disposeWatch = null;
    }
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    this.blockIds = [];
  }
}
