import { Notice, Plugin, TFile, normalizePath } from "obsidian";
import { VIEW_TYPE_BUILDER, PLUGIN_ICON } from "./constants";
import {
  DEFAULT_SETTINGS,
  SpecoratorSettings,
  ComponentDef,
} from "./core/domain/types";
import type { ProjectStore, LibraryScanPort, ViewerPort } from "./core/ports";
import { slugify } from "./core/ids";
import { serializeComponentNote } from "./core/library/componentNote";
import { PageIndexService } from "./core/usecases/pageIndexService";
import { VaultProjectStore } from "./adapters/obsidian/ProjectStore";
import { VaultLibraryScan } from "./adapters/obsidian/LibraryScan";
import { ObsidianViewer } from "./adapters/obsidian/Viewer";
import { GrapesRenderer } from "./adapters/editor/grapes";
import { BuildRunner } from "./adapters/build/BuildRunner";
import { PreviewServer } from "./adapters/server/PreviewServer";
import { McpServer } from "./adapters/server/McpServer";
import { ClaudeAssetInstaller } from "./adapters/claude/installer";
import type { McpToolDeps } from "./core/mcp/tools";
import type { ProjectData } from "./core/domain/types";
import { BuilderView, type BuilderHost } from "./ui/BuilderView";
import { SpecoratorSettingTab } from "./ui/SettingsTab";
import {
  CreateProjectModal,
  SaveComponentModal,
  ConsentModal,
} from "./ui/modals";

const PROJECT_TAG = "specorator/project";

export default class SpecoratorPlugin extends Plugin implements BuilderHost {
  settings!: SpecoratorSettings;
  projectStore!: ProjectStore;
  library!: LibraryScanPort;
  private viewer!: ViewerPort;
  private renderer!: GrapesRenderer;
  private buildRunner!: BuildRunner;
  private previewServer = new PreviewServer();
  private mcpServer = new McpServer();
  private claude!: ClaudeAssetInstaller;
  private pageIndex!: PageIndexService;
  private pageIndexTimers = new Map<string, ReturnType<typeof setTimeout>>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.projectStore = new VaultProjectStore(this.app, () => ({
      projects: this.settings.projectsFolder,
      data: this.settings.dataFolder,
    }));
    this.library = new VaultLibraryScan(
      this.app,
      () => this.settings.componentsFolder
    );
    this.viewer = new ObsidianViewer(this.app);
    this.renderer = new GrapesRenderer();
    this.pageIndex = new PageIndexService(this.projectStore, this.renderer);
    this.buildRunner = new BuildRunner(
      this.app,
      this.projectStore,
      this.renderer,
      this.manifest.dir ??
        `${this.app.vault.configDir}/plugins/${this.manifest.id}`
    );
    this.claude = new ClaudeAssetInstaller(this.app, () => ({
      mcpUrl: `http://127.0.0.1:${this.settings.mcpPort}/mcp`,
    }));

    this.registerView(VIEW_TYPE_BUILDER, (leaf) => new BuilderView(leaf, this));

    this.addRibbonIcon(PLUGIN_ICON, "Specorator: open builder", () => {
      void this.openActiveOrCreate();
    });

    this.addCommand({
      id: "create-project",
      name: "Create project",
      callback: () => {
        new CreateProjectModal(this.app, async (title) => {
          const meta = await this.projectStore.create(title);
          await this.openProject(meta.id);
        }).open();
      },
    });

    this.addCommand({
      id: "open-active-as-project",
      name: "Open active note in builder",
      checkCallback: (checking) => {
        const id = this.activeProjectId();
        if (checking) return !!id;
        if (id) void this.openProject(id);
        return true;
      },
    });

    this.addCommand({
      id: "create-component",
      name: "Create component note",
      callback: () => {
        void this.createStarterComponent();
      },
    });

    this.addCommand({
      id: "save-selection-as-component",
      name: "Save selection as component",
      checkCallback: (checking) => {
        const view = this.activeBuilderView();
        const hasSelection = !!view?.getEditor()?.getSelected();
        if (checking) return hasSelection;
        if (hasSelection) this.saveSelectionAsComponent();
        return true;
      },
    });

    this.addCommand({
      id: "refresh-library",
      name: "Refresh component library",
      callback: () => {
        for (const leaf of this.app.workspace.getLeavesOfType(
          VIEW_TYPE_BUILDER
        )) {
          const view = leaf.view;
          if (view instanceof BuilderView) void view.reloadLibrary();
        }
        new Notice("Specorator: component library refreshed.");
      },
    });

    this.addCommand({
      id: "build-project",
      name: "Build project (static site)",
      checkCallback: (checking) => {
        const id = this.currentProjectId();
        if (checking) return !!id;
        if (id) void this.buildProject(id);
        return true;
      },
    });

    this.addCommand({
      id: "preview-project",
      name: "Preview project",
      checkCallback: (checking) => {
        const id = this.currentProjectId();
        if (checking) return !!id;
        if (id) this.previewProject(id);
        return true;
      },
    });

    this.addCommand({
      id: "stop-preview",
      name: "Stop preview server",
      checkCallback: (checking) => {
        if (checking) return this.previewServer.isRunning();
        void this.previewServer.stop().then(() => {
          new Notice("Specorator: preview server stopped.");
        });
        return true;
      },
    });

    this.addCommand({
      id: "refresh-page-index",
      name: "Refresh project page index",
      checkCallback: (checking) => {
        const id = this.currentProjectId();
        if (checking) return !!id;
        if (id) void this.pageIndex.refresh(id);
        return true;
      },
    });

    this.addCommand({
      id: "restore-project-backup",
      name: "Restore project from backup",
      checkCallback: (checking) => {
        const id = this.currentProjectId();
        if (checking) return !!id;
        if (id) void this.restoreBackup(id);
        return true;
      },
    });

    this.addCommand({
      id: "start-mcp",
      name: "Start MCP server",
      checkCallback: (checking) => {
        if (checking) return !this.mcpServer.isRunning();
        this.startMcp();
        return true;
      },
    });

    this.addCommand({
      id: "stop-mcp",
      name: "Stop MCP server",
      checkCallback: (checking) => {
        if (checking) return this.mcpServer.isRunning();
        void this.mcpServer.stop().then(() => {
          new Notice("Specorator: MCP server stopped.");
        });
        return true;
      },
    });

    this.addSettingTab(new SpecoratorSettingTab(this.app, this, this));
  }

  onunload(): void {
    for (const timer of this.pageIndexTimers.values()) clearTimeout(timer);
    this.pageIndexTimers.clear();
    void this.previewServer.stop();
    void this.mcpServer.stop();
  }

  // --- BuilderHost ---------------------------------------------------------

  autosaveSteps(): number {
    return 1;
  }

  afterSave(id: string): void {
    const existing = this.pageIndexTimers.get(id);
    if (existing) clearTimeout(existing);
    this.pageIndexTimers.set(
      id,
      setTimeout(() => {
        this.pageIndexTimers.delete(id);
        void this.pageIndex.refresh(id);
      }, 4000)
    );
  }

  // --- SettingsHost --------------------------------------------------------

  getSettings(): SpecoratorSettings {
    return this.settings;
  }

  async saveSettings(patch: Partial<SpecoratorSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.saveData(this.settings);
  }

  async setClaudeAssets(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        const { written, skipped } = await this.claude.install();
        new Notice(
          `Specorator: installed ${written} Claude asset(s)` +
            (skipped.length ? `; skipped ${skipped.length} existing.` : ".")
        );
      } else {
        await this.claude.uninstall();
        new Notice("Specorator: removed Claude assets.");
      }
      await this.saveSettings({ claudeAssetsInstalled: enabled });
    } catch (e) {
      new Notice(`Specorator: Claude asset update failed (${String(e)}).`);
    }
  }

  // --- helpers -------------------------------------------------------------

  private async loadSettings(): Promise<void> {
    const loaded =
      (await this.loadData()) as Partial<SpecoratorSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      consent: { ...DEFAULT_SETTINGS.consent, ...(loaded?.consent ?? {}) },
    };
  }

  private async openProject(projectId: string): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: VIEW_TYPE_BUILDER,
      active: true,
      state: { projectId },
    });
    this.app.workspace.revealLeaf(leaf);
  }

  private async openActiveOrCreate(): Promise<void> {
    const id = this.activeProjectId();
    if (id) {
      await this.openProject(id);
      return;
    }
    new CreateProjectModal(this.app, async (title) => {
      const meta = await this.projectStore.create(title);
      await this.openProject(meta.id);
    }).open();
  }

  private activeProjectId(): string | null {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") return null;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm || typeof fm["id"] !== "string") return null;
    const tags = fm["tags"];
    const tagged = Array.isArray(tags)
      ? tags.some((t) => String(t) === PROJECT_TAG)
      : typeof tags === "string" && tags.includes(PROJECT_TAG);
    return tagged ? fm["id"] : null;
  }

  private activeBuilderView(): BuilderView | null {
    const view = this.app.workspace.getActiveViewOfType(BuilderView);
    return view ?? null;
  }

  private currentProjectId(): string | null {
    return this.activeBuilderView()?.getProjectId() ?? this.activeProjectId();
  }

  private async buildProject(id: string) {
    const out = await this.buildRunner.build(id);
    if (!out) {
      new Notice(
        "Specorator: build failed (desktop only, or no project data)."
      );
      return null;
    }
    if (out.warnings.length) {
      new Notice(`Specorator: built with warnings — ${out.warnings[0]}`);
    } else {
      new Notice("Specorator: build complete.");
    }
    return out;
  }

  private async restoreBackup(id: string): Promise<void> {
    if (await this.projectStore.restoreBackup(id)) {
      this.notifyProjectChanged(id);
      new Notice("Specorator: restored project from backup.");
    } else {
      new Notice("Specorator: no usable backup to restore.");
    }
  }

  private previewProject(id: string): void {
    this.ensureConsent(
      "previewServer",
      {
        title: "Start local preview server?",
        body: "Specorator will run a local webserver bound to 127.0.0.1 to serve your built site. It is local-only and off by default.",
        confirmText: "Start preview",
      },
      async () => {
        const out = await this.buildProject(id);
        const root = this.buildRunner.distRoot();
        if (!out || !root) return;
        try {
          const port = await this.previewServer.start(
            root,
            this.settings.previewPort
          );
          await this.viewer.open(`http://127.0.0.1:${port}${out.sitePath}`);
          new Notice(`Specorator: previewing on 127.0.0.1:${port}`);
        } catch (e) {
          new Notice(`Specorator: could not start preview (${String(e)}).`);
        }
      }
    );
  }

  private startMcp(): void {
    this.ensureConsent(
      "mcpServer",
      {
        title: "Start the MCP server?",
        body: "Specorator will run a local MCP server bound to 127.0.0.1 so AI agents can drive the builder (list/create projects, get/set project data, build). Local-only and off by default.",
        confirmText: "Start MCP",
      },
      async () => {
        try {
          const port = await this.mcpServer.start(
            this.settings.mcpPort,
            this.mcpDeps()
          );
          new Notice(`Specorator: MCP server on 127.0.0.1:${port}/mcp`);
        } catch (e) {
          new Notice(`Specorator: could not start MCP server (${String(e)}).`);
        }
      }
    );
  }

  private mcpDeps(): McpToolDeps {
    return {
      listComponents: async () =>
        (await this.library.scan()).map((d) => ({
          blockId: d.blockId,
          label: d.label,
          category: d.category,
        })),
      listProjects: () => this.projectStore.list(),
      getProjectData: (id) => this.projectStore.loadData(id),
      setProjectData: async (id, data: ProjectData) => {
        const exists = (await this.projectStore.list()).some(
          (m) => m.id === id
        );
        if (!exists) return { ok: false, error: `No project with id "${id}".` };
        // Validate by round-tripping through the headless renderer so a bad
        // agent write can't corrupt a project (the prior data is also backed up).
        try {
          await this.renderer.render(data);
        } catch (e) {
          return {
            ok: false,
            error: `Rejected: not valid GrapesJS project data (${String(e)}).`,
          };
        }
        await this.projectStore.saveData(id, data);
        this.notifyProjectChanged(id);
        return { ok: true };
      },
      createProject: (title) => this.projectStore.create(title),
      buildProject: async (id) => {
        const out = await this.buildRunner.build(id);
        return out ? { sitePath: out.sitePath } : null;
      },
    };
  }

  /** Reload any open builder leaves bound to this project (ADR-0009). */
  private notifyProjectChanged(id: string): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_BUILDER)) {
      const view = leaf.view;
      if (view instanceof BuilderView && view.getProjectId() === id) {
        void view.reloadFromDisk();
      }
    }
  }

  private ensureConsent(
    key: keyof SpecoratorSettings["consent"],
    opts: { title: string; body: string; confirmText: string },
    action: () => void | Promise<void>
  ): void {
    if (this.settings.consent[key]) {
      void action();
      return;
    }
    new ConsentModal(this.app, opts, async () => {
      await this.saveSettings({
        consent: { ...this.settings.consent, [key]: true },
      });
      void action();
    }).open();
  }

  private saveSelectionAsComponent(): void {
    const editor = this.activeBuilderView()?.getEditor();
    const selected = editor?.getSelected();
    if (!editor || !selected) {
      new Notice("Specorator: nothing selected in the builder.");
      return;
    }
    const html = selected.toHTML();
    const css = editor.getCss({ component: selected }) ?? "";
    new SaveComponentModal(this.app, (fields) => {
      const def: ComponentDef = {
        blockId: slugify(fields.label) || "component",
        label: fields.label,
        category: fields.category,
        icon: fields.icon,
        html,
        css,
        doc: "",
        sourcePath: "",
      };
      void this.writeComponentNote(def);
    }).open();
  }

  private async createStarterComponent(): Promise<void> {
    const def: ComponentDef = {
      blockId: "new-component",
      label: "New Component",
      category: "Components",
      icon: "",
      html: '<section class="sp-block">\n  <h2>New component</h2>\n  <p>Describe and style this component.</p>\n</section>',
      css: ".sp-block { padding: 2rem; }",
      doc: "Describe what this component is and how to use it.",
      sourcePath: "",
    };
    const file = await this.writeComponentNote(def);
    if (file) await this.app.workspace.getLeaf(true).openFile(file);
  }

  private async writeComponentNote(def: ComponentDef): Promise<TFile | null> {
    const folder = normalizePath(this.settings.componentsFolder);
    if (folder && !this.app.vault.getFolderByPath(folder)) {
      await this.app.vault.createFolder(folder).catch(() => {});
    }
    let path = normalizePath(
      `${folder}/${slugify(def.label) || "component"}.md`
    );
    let n = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${folder}/${slugify(def.label)}-${n++}.md`);
    }
    const created = await this.app.vault.create(
      path,
      serializeComponentNote(def)
    );
    new Notice(`Specorator: created component "${def.label}".`);
    return created instanceof TFile ? created : null;
  }
}
