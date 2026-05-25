import { App, normalizePath } from "obsidian";
import {
  claudeAssetFiles,
  mergeMcpConfig,
  removeMcpConfig,
  MANAGED_MARKER,
  type ClaudeAssetOptions,
} from "../../core/claude/assets";

const MCP_JSON = ".mcp.json";

/**
 * Installs/removes the bundled Claude assets into the vault's .claude/ directory
 * (a dot-folder → adapter API) and merges .mcp.json (ADR-0015). Idempotent and
 * non-destructive: only files carrying the managed marker are overwritten or
 * removed.
 */
export class ClaudeAssetInstaller {
  constructor(
    private app: App,
    private getOptions: () => ClaudeAssetOptions
  ) {}

  async install(): Promise<{ written: number; skipped: string[] }> {
    const adapter = this.app.vault.adapter;
    const skipped: string[] = [];
    let written = 0;
    for (const file of claudeAssetFiles()) {
      const path = normalizePath(file.path);
      if (await adapter.exists(path)) {
        const current = await adapter.read(path);
        if (!current.includes(MANAGED_MARKER)) {
          skipped.push(path);
          continue;
        }
      }
      await this.ensureDir(dirOf(path));
      await adapter.write(path, file.content);
      written++;
    }

    const existing = (await adapter.exists(MCP_JSON))
      ? await adapter.read(MCP_JSON)
      : null;
    await adapter.write(MCP_JSON, mergeMcpConfig(existing, this.getOptions()));

    return { written, skipped };
  }

  async uninstall(): Promise<void> {
    const adapter = this.app.vault.adapter;
    for (const file of claudeAssetFiles()) {
      const path = normalizePath(file.path);
      if (!(await adapter.exists(path))) continue;
      const current = await adapter.read(path);
      if (current.includes(MANAGED_MARKER)) await adapter.remove(path);
    }

    if (await adapter.exists(MCP_JSON)) {
      const next = removeMcpConfig(await adapter.read(MCP_JSON));
      if (next) await adapter.write(MCP_JSON, next);
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    const parts = dir.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!(await adapter.exists(cur))) await adapter.mkdir(cur);
    }
  }
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}
