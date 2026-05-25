import grapesjs, { Editor } from "grapesjs";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import gjsBlocksBasic from "grapesjs-blocks-basic";
import type { BlockConfig, ProjectData } from "../../core/domain/types";
import type { RendererPort, RenderedPage } from "../../core/ports";
import { slugify } from "../../core/ids";

export interface BuilderEditorOptions {
  container: HTMLElement;
  load: () => Promise<ProjectData>;
  store: (data: ProjectData) => Promise<void>;
  blocks: BlockConfig[];
  stepsBeforeSave?: number;
}

/**
 * Create the interactive editor for a BuilderView (ADR-0013). The custom
 * 'specorator' storage is registered via a plugin function so it exists before
 * GrapesJS autoloads.
 */
export function createBuilderEditor(opts: BuilderEditorOptions): Editor {
  const storagePlugin = (editor: Editor) => {
    editor.Storage.add("specorator", {
      async load() {
        return ((await opts.load()) ?? {}) as ProjectData;
      },
      async store(data: ProjectData) {
        await opts.store(data);
        return data;
      },
    });
  };

  const blocksPlugin = (editor: Editor) => {
    addBlocks(editor, opts.blocks);
  };

  return grapesjs.init({
    container: opts.container,
    height: "100%",
    fromElement: false,
    storageManager: {
      type: "specorator",
      autosave: true,
      autoload: true,
      stepsBeforeSave: opts.stepsBeforeSave ?? 1,
    },
    plugins: [storagePlugin, blocksPlugin, gjsBlocksBasic, gjsPresetWebpage],
    pluginsOpts: {},
  });
}

function addBlocks(editor: Editor, blocks: BlockConfig[]): void {
  for (const b of blocks) {
    editor.Blocks.add(b.id, {
      label: b.label,
      category: b.category,
      media: b.media,
      content: b.content,
    });
  }
}

/**
 * Reconcile the component-library blocks in a live editor: remove the previously
 * registered ids, add the current set. Returns the new id set (ADR-0012/0014).
 */
export function syncComponentBlocks(
  editor: Editor,
  blocks: BlockConfig[],
  previousIds: string[]
): string[] {
  for (const id of previousIds) editor.Blocks.remove(id);
  addBlocks(editor, blocks);
  return blocks.map((b) => b.id);
}

/** Headless renderer (RendererPort, ADR-0004). Runs in the Electron renderer. */
export class GrapesRenderer implements RendererPort {
  async render(data: ProjectData): Promise<{ pages: RenderedPage[] }> {
    const host = document.createElement("div");
    host.className = "sp-headless-host";
    document.body.appendChild(host);
    const editor = grapesjs.init({
      container: host,
      headless: true,
      storageManager: false,
    });
    try {
      editor.loadProjectData(data as Parameters<Editor["loadProjectData"]>[0]);
      const pagesApi = editor.Pages;
      const pages: RenderedPage[] = pagesApi.getAll().map((page) => {
        pagesApi.select(page);
        const component = page.getMainComponent();
        const name = page.getName() || "page";
        return {
          name,
          slug: slugify(name) || "page",
          html: editor.getHtml({ component }) ?? "",
          css: editor.getCss({ component }) ?? "",
        };
      });
      return { pages };
    } finally {
      editor.destroy();
      host.remove();
    }
  }
}
