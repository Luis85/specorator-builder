import { describe, it, expect, vi } from "vitest";
import { handleRpc, PROTOCOL_VERSION } from "./jsonrpc";
import type { McpToolDeps } from "./tools";

const deps = (): McpToolDeps => ({
  listComponents: vi.fn(async () => []),
  listProjects: vi.fn(async () => []),
  getProjectData: vi.fn(async () => null),
  setProjectData: vi.fn(async () => ({ ok: true })),
  createProject: vi.fn(async () => ({
    id: "a",
    title: "t",
    home: "home",
    status: "draft",
    dataFile: "x",
  })),
  buildProject: vi.fn(async () => null),
});

describe("handleRpc", () => {
  it("answers initialize with protocol + capabilities", async () => {
    const r = await handleRpc(
      { jsonrpc: "2.0", id: 1, method: "initialize" },
      deps()
    );
    expect(r?.result).toMatchObject({
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
    });
  });

  it("lists tools", async () => {
    const r = await handleRpc(
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      deps()
    );
    expect((r?.result as { tools: unknown[] }).tools.length).toBeGreaterThan(0);
  });

  it("returns null for notifications", async () => {
    const r = await handleRpc(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      deps()
    );
    expect(r).toBeNull();
  });

  it("errors on unknown method", async () => {
    const r = await handleRpc(
      { jsonrpc: "2.0", id: 3, method: "bogus" },
      deps()
    );
    expect(r?.error?.code).toBe(-32601);
  });

  it("routes tools/call to the dispatcher", async () => {
    const d = deps();
    const r = await handleRpc(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "list_projects", arguments: {} },
      },
      d
    );
    expect(d.listProjects).toHaveBeenCalled();
    expect(r?.result).toBeTruthy();
  });
});
