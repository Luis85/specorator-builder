import { describe, it, expect, vi } from "vitest";
import { callTool, TOOL_DEFS, type McpToolDeps } from "./tools";
import type { ProjectMeta } from "../domain/types";

const meta: ProjectMeta = {
  id: "abc",
  title: "T",
  home: "home",
  status: "draft",
  dataFile: "x.json",
};

function deps(overrides: Partial<McpToolDeps> = {}): McpToolDeps {
  return {
    listComponents: vi.fn(async () => [
      { blockId: "hero", label: "Hero", category: "Sections" },
    ]),
    listProjects: vi.fn(async () => [meta]),
    getProjectData: vi.fn(async () => ({ pages: [] })),
    setProjectData: vi.fn(async () => ({ ok: true })),
    createProject: vi.fn(async () => meta),
    buildProject: vi.fn(async () => ({ sitePath: "/abc/" })),
    ...overrides,
  };
}

describe("TOOL_DEFS", () => {
  it("declares the expected tools", () => {
    expect(TOOL_DEFS.map((t) => t.name)).toEqual([
      "list_components",
      "list_projects",
      "get_project_data",
      "set_project_data",
      "create_project",
      "build_project",
    ]);
  });
});

describe("callTool", () => {
  it("lists components", async () => {
    const r = await callTool("list_components", {}, deps());
    expect(r.content[0].text).toContain("hero");
  });

  it("validates required args", async () => {
    const r = await callTool("get_project_data", {}, deps());
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("id");
  });

  it("reports missing project data", async () => {
    const r = await callTool(
      "get_project_data",
      { id: "x" },
      deps({ getProjectData: async () => null })
    );
    expect(r.isError).toBe(true);
  });

  it("sets project data through deps", async () => {
    const set = vi.fn(async () => ({ ok: true }));
    const r = await callTool(
      "set_project_data",
      { id: "abc", data: { pages: [] } },
      deps({ setProjectData: set })
    );
    expect(set).toHaveBeenCalledWith("abc", { pages: [] });
    expect(r.isError).toBeUndefined();
  });

  it("surfaces a setProjectData rejection reason", async () => {
    const r = await callTool(
      "set_project_data",
      { id: "abc", data: { bad: true } },
      deps({
        setProjectData: async () => ({ ok: false, error: "invalid data" }),
      })
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("invalid data");
  });

  it("errors on unknown tool", async () => {
    const r = await callTool("nope", {}, deps());
    expect(r.isError).toBe(true);
  });
});
