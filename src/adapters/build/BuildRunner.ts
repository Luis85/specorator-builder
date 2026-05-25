import {
  App,
  FileSystemAdapter,
  Platform,
  TFile,
  normalizePath,
} from "obsidian";
import { promises as fs } from "fs";
import * as path from "path";
import type { ProjectStore, RendererPort } from "../../core/ports";
import { planBuild } from "../../core/build/plan";
import {
  collectAssetUrls,
  isExternalUrl,
  rewriteUrls,
} from "../../core/build/assets";

export interface BuildOutput {
  distDir: string;
  /** Site-root-relative path the preview server serves, e.g. "/9f3a2c/". */
  sitePath: string;
}

/** Renders a project to a static multi-page site in the plugin dist folder. */
export class BuildRunner {
  constructor(
    private app: App,
    private store: ProjectStore,
    private renderer: RendererPort,
    private pluginDir: string
  ) {}

  /** Absolute path to the shared dist root (served by the preview server). */
  distRoot(): string | null {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) return null;
    return path.join(adapter.getBasePath(), this.pluginDir, "dist");
  }

  async build(id: string): Promise<BuildOutput | null> {
    if (!Platform.isDesktop) return null;
    const root = this.distRoot();
    const loaded = await this.store.load(id);
    if (!root || !loaded) return null;

    const { meta, data } = loaded;
    const { pages } = await this.renderer.render(data);
    const plan = planBuild(meta.title, meta.home ?? "home", pages);

    const projectDist = path.join(root, id);
    await fs.rm(projectDist, { recursive: true, force: true });
    await fs.mkdir(path.join(projectDist, "assets"), { recursive: true });

    const copied = new Map<string, string>(); // vault path -> asset filename
    for (const file of plan.files) {
      const map = await this.rewriteAndCopy(
        file.path,
        file.content,
        projectDist,
        copied
      );
      const outPath = path.join(projectDist, file.path);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, rewriteUrls(file.content, map), "utf8");
    }

    return { distDir: projectDist, sitePath: `/${id}/` };
  }

  private async rewriteAndCopy(
    filePath: string,
    content: string,
    projectDist: string,
    copied: Map<string, string>
  ): Promise<Map<string, string>> {
    const depth = filePath.split("/").length - 1;
    const prefix = "../".repeat(depth);
    const map = new Map<string, string>();
    for (const url of collectAssetUrls(content, content)) {
      if (isExternalUrl(url)) continue;
      const file = this.resolveAsset(url);
      if (!file) continue;
      let name = copied.get(file.path);
      if (!name) {
        name = uniqueName(file.name, new Set(copied.values()));
        copied.set(file.path, name);
        const bytes = await this.app.vault.readBinary(file);
        await fs.writeFile(
          path.join(projectDist, "assets", name),
          Buffer.from(bytes)
        );
      }
      map.set(url, `${prefix}assets/${name}`);
    }
    return map;
  }

  private resolveAsset(url: string): TFile | null {
    const cleaned = decodeURIComponent(url.split("?")[0]);
    const direct = this.app.vault.getAbstractFileByPath(normalizePath(cleaned));
    if (direct instanceof TFile) return direct;
    const base = cleaned.split("/").pop();
    if (base) {
      const match = this.app.vault.getFiles().find((f) => f.name === base);
      if (match) return match;
    }
    return null;
  }
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot === -1 ? name : name.slice(0, dot);
  const ext = dot === -1 ? "" : name.slice(dot);
  let n = 2;
  let candidate = `${stem}-${n}${ext}`;
  while (used.has(candidate)) candidate = `${stem}-${++n}${ext}`;
  return candidate;
}
