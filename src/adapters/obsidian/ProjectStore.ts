import { App, normalizePath, TFile } from "obsidian";
import type { ProjectStore } from "../../core/ports";
import type { ProjectData, ProjectMeta } from "../../core/domain/types";
import { shortId, slugify } from "../../core/ids";
import { splitFrontmatter } from "../../core/parsing/frontmatter";
import { replacePageIndex } from "../../core/note/pageIndex";

const PROJECT_TAG = "specorator/project";

/**
 * Owns a Project: the markdown Project Note (Vault API) + the JSON data file in
 * the hidden Specorator/.data/ dot-folder (adapter API — dot-folders are not
 * Vault-indexed). Atomic temp-write + rename for the data file (ADR-0005/0008).
 */
export class VaultProjectStore implements ProjectStore {
  constructor(
    private app: App,
    private getFolders: () => { projects: string; data: string }
  ) {}

  async create(title: string, folder?: string): Promise<ProjectMeta> {
    const { projects, data } = this.getFolders();
    const id = shortId();
    const projectsFolder = normalizePath(folder || projects);
    await this.ensureVaultFolder(projectsFolder);
    const dataFile = normalizePath(`${data}/${id}.gjs.json`);
    const meta: ProjectMeta = {
      id,
      title,
      home: "home",
      status: "draft",
      dataFile,
    };

    await this.writeData(dataFile, {});
    const notePath = await this.uniqueNotePath(projectsFolder, slugify(title));
    await this.app.vault.create(notePath, this.renderNote(meta));
    return meta;
  }

  async list(): Promise<ProjectMeta[]> {
    const out: ProjectMeta[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const meta = this.metaFromFile(file);
      if (meta) out.push(meta);
    }
    return out;
  }

  async load(
    id: string
  ): Promise<{ meta: ProjectMeta; data: ProjectData } | null> {
    const meta = (await this.list()).find((m) => m.id === id);
    if (!meta) return null;
    const data = (await this.loadData(id)) ?? {};
    return { meta, data };
  }

  async loadData(id: string): Promise<ProjectData | null> {
    const meta = (await this.list()).find((m) => m.id === id);
    const path = meta?.dataFile ?? this.dataPathFor(id);
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(path))) return null;
    try {
      return JSON.parse(await adapter.read(path)) as ProjectData;
    } catch {
      return null;
    }
  }

  async saveData(id: string, data: ProjectData): Promise<void> {
    const meta = (await this.list()).find((m) => m.id === id);
    await this.writeData(meta?.dataFile ?? this.dataPathFor(id), data);
    // The Page Index render is orchestrated by PageIndexService (it owns the
    // renderer); ProjectStore exposes writePageIndex below for it to call.
  }

  async restoreBackup(id: string): Promise<boolean> {
    const adapter = this.app.vault.adapter;
    const meta = (await this.list()).find((m) => m.id === id);
    const path = meta?.dataFile ?? this.dataPathFor(id);
    const bak = `${path}.bak`;
    if (!(await adapter.exists(bak))) return false;
    const content = await adapter.read(bak);
    try {
      JSON.parse(content);
    } catch {
      return false;
    }
    const tmp = `${path}.tmp`;
    await adapter.write(tmp, content);
    if (await adapter.exists(path)) await adapter.remove(path);
    await adapter.rename(tmp, path);
    return true;
  }

  async writePageIndex(id: string, section: string): Promise<void> {
    const file = this.noteFileFor(id);
    if (!file) return;
    await this.app.vault.process(file, (content) => {
      const { frontmatter, body } = splitFrontmatter(content);
      const next = replacePageIndex(body, section);
      return frontmatter ? `---\n${frontmatter}\n---\n${next}` : next;
    });
  }

  // --- internals -----------------------------------------------------------

  private noteFileFor(id: string): TFile | null {
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm && hasTag(fm, PROJECT_TAG) && fm["id"] === id) return file;
    }
    return null;
  }

  private dataPathFor(id: string): string {
    return normalizePath(`${this.getFolders().data}/${id}.gjs.json`);
  }

  private metaFromFile(file: TFile): ProjectMeta | null {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm || !hasTag(fm, PROJECT_TAG) || typeof fm["id"] !== "string") {
      return null;
    }
    return {
      id: fm["id"],
      title: typeof fm["title"] === "string" ? fm["title"] : file.basename,
      home: typeof fm["home"] === "string" ? fm["home"] : "home",
      status: typeof fm["status"] === "string" ? fm["status"] : "draft",
      dataFile:
        typeof fm["data-file"] === "string"
          ? fm["data-file"]
          : this.dataPathFor(fm["id"]),
    };
  }

  private renderNote(meta: ProjectMeta): string {
    return [
      "---",
      "tags: [specorator/project]",
      `id: ${meta.id}`,
      `title: ${meta.title}`,
      `home: ${meta.home}`,
      `status: ${meta.status}`,
      `data-file: ${meta.dataFile}`,
      `updated: ${new Date().toISOString().slice(0, 10)}`,
      "---",
      "",
      `# ${meta.title}`,
      "",
      "Edited visually with Specorator Builder. The page index below is",
      "auto-generated — do not edit.",
      "",
      "## Pages (auto-generated — do not edit)",
      "",
    ].join("\n");
  }

  private async writeData(path: string, data: ProjectData): Promise<void> {
    const adapter = this.app.vault.adapter;
    await this.ensureAdapterFolder(dirOf(path));
    const json = JSON.stringify(data, null, 2);
    // Keep a single rolling backup so a bad write (e.g. an MCP agent) is
    // recoverable (ADR-0009).
    if (await adapter.exists(path)) {
      const prev = await adapter.read(path);
      await adapter.write(`${path}.bak`, prev);
      await adapter.remove(path);
    }
    const tmp = `${path}.tmp`;
    await adapter.write(tmp, json);
    await adapter.rename(tmp, path);
  }

  private async ensureVaultFolder(folder: string): Promise<void> {
    if (!folder) return;
    if (!this.app.vault.getFolderByPath(folder)) {
      await this.app.vault.createFolder(folder).catch(() => {});
    }
  }

  private async ensureAdapterFolder(folder: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    const parts = folder.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!(await adapter.exists(cur))) await adapter.mkdir(cur);
    }
  }

  private async uniqueNotePath(folder: string, base: string): Promise<string> {
    let candidate = normalizePath(`${folder}/${base || "untitled"}.md`);
    let n = 2;
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      candidate = normalizePath(`${folder}/${base}-${n++}.md`);
    }
    return candidate;
  }
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function hasTag(fm: Record<string, unknown>, tag: string): boolean {
  const tags = fm["tags"];
  if (Array.isArray(tags)) return tags.some((t) => String(t) === tag);
  if (typeof tags === "string")
    return tags.split(/[,\s]+/).some((t) => t === tag);
  return false;
}
