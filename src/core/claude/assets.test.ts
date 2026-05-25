import { describe, it, expect } from "vitest";
import {
  claudeAssetFiles,
  mergeMcpConfig,
  removeMcpConfig,
  MANAGED_MARKER,
} from "./assets";

const opts = { mcpUrl: "http://127.0.0.1:4831/mcp" };

describe("claudeAssetFiles", () => {
  it("produces marked .claude assets", () => {
    const files = claudeAssetFiles();
    expect(files.every((f) => f.path.startsWith(".claude/"))).toBe(true);
    expect(files.every((f) => f.content.includes(MANAGED_MARKER))).toBe(true);
    expect(files.some((f) => f.path.includes("agents/"))).toBe(true);
    expect(files.some((f) => f.path.includes("commands/"))).toBe(true);
    expect(files.some((f) => f.path.includes("skills/"))).toBe(true);
  });
});

describe("mergeMcpConfig", () => {
  it("creates config when none exists", () => {
    const json = JSON.parse(mergeMcpConfig(null, opts));
    expect(json.mcpServers.specorator).toEqual({
      type: "http",
      url: opts.mcpUrl,
    });
  });
  it("preserves other servers", () => {
    const existing = JSON.stringify({ mcpServers: { other: { url: "x" } } });
    const json = JSON.parse(mergeMcpConfig(existing, opts));
    expect(json.mcpServers.other).toEqual({ url: "x" });
    expect(json.mcpServers.specorator).toBeTruthy();
  });
});

describe("removeMcpConfig", () => {
  it("removes only our server", () => {
    const existing = JSON.stringify({
      mcpServers: { other: { url: "x" }, specorator: { url: "y" } },
    });
    const json = JSON.parse(removeMcpConfig(existing)!);
    expect(json.mcpServers.specorator).toBeUndefined();
    expect(json.mcpServers.other).toEqual({ url: "x" });
  });
});
