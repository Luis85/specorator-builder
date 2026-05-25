import { App, normalizePath, TAbstractFile, TFile } from "obsidian";
import type { LibraryScanPort } from "../../core/ports";
import type { ComponentDef } from "../../core/domain/types";
import { splitFrontmatter } from "../../core/parsing/frontmatter";
import {
  isComponentNote,
  parseComponentDef,
} from "../../core/library/componentNote";

/** Scans the Library folder for component notes and registers change watchers. */
export class VaultLibraryScan implements LibraryScanPort {
  constructor(
    private app: App,
    private getFolder: () => string
  ) {}

  async scan(): Promise<ComponentDef[]> {
    const folder = normalizePath(this.getFolder());
    const prefix = folder ? `${folder}/` : "";
    const defs: ComponentDef[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (folder && !file.path.startsWith(prefix)) continue;
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
      if (!isComponentNote(fm)) continue;
      const content = await this.app.vault.cachedRead(file);
      const { body } = splitFrontmatter(content);
      defs.push(
        parseComponentDef({
          frontmatter: fm,
          body,
          basename: file.basename,
          path: file.path,
        })
      );
    }
    return defs;
  }

  onChange(handler: () => void): () => void {
    const folder = normalizePath(this.getFolder());
    const prefix = folder ? `${folder}/` : "";
    let timer: ReturnType<typeof setTimeout> | null = null;
    const relevant = (file: TAbstractFile) =>
      file instanceof TFile &&
      file.extension === "md" &&
      (!folder || file.path.startsWith(prefix));
    const fire = (file: TAbstractFile) => {
      if (!relevant(file)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(handler, 400);
    };

    // metadataCache 'changed' fires after frontmatter is parsed (fresh tags);
    // vault delete/rename cover removal and moves.
    const vaultRefs = [
      this.app.vault.on("delete", fire),
      this.app.vault.on("rename", fire),
    ];
    const cacheRef = this.app.metadataCache.on("changed", (file) => fire(file));

    return () => {
      if (timer) clearTimeout(timer);
      for (const ref of vaultRefs) this.app.vault.offref(ref);
      this.app.metadataCache.offref(cacheRef);
    };
  }
}
