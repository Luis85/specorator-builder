import type { ProjectData, ProjectMeta } from "../domain/types";

/** Capabilities the MCP tools need, injected by the adapter (keeps tools pure). */
export interface McpToolDeps {
  listComponents(): Promise<
    { blockId: string; label: string; category: string }[]
  >;
  listProjects(): Promise<ProjectMeta[]>;
  getProjectData(id: string): Promise<ProjectData | null>;
  setProjectData(id: string, data: ProjectData): Promise<boolean>;
  createProject(title: string): Promise<ProjectMeta>;
  buildProject(id: string): Promise<{ sitePath: string } | null>;
}

export interface McpToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const obj = (
  props: Record<string, unknown>,
  required: string[] = []
): Record<string, unknown> => ({
  type: "object",
  properties: props,
  required,
});

export const TOOL_DEFS: McpToolDef[] = [
  {
    name: "list_components",
    description: "List the reusable component blocks in the library.",
    inputSchema: obj({}),
  },
  {
    name: "list_projects",
    description: "List Specorator projects (id, title, status).",
    inputSchema: obj({}),
  },
  {
    name: "get_project_data",
    description:
      "Get a project's GrapesJS native project JSON (the editing source of truth).",
    inputSchema: obj({ id: { type: "string" } }, ["id"]),
  },
  {
    name: "set_project_data",
    description:
      "Replace a project's GrapesJS project JSON. Must be valid GrapesJS project data.",
    inputSchema: obj({ id: { type: "string" }, data: { type: "object" } }, [
      "id",
      "data",
    ]),
  },
  {
    name: "create_project",
    description: "Create a new project and return its metadata.",
    inputSchema: obj({ title: { type: "string" } }, ["title"]),
  },
  {
    name: "build_project",
    description: "Build a project to a static site and return its site path.",
    inputSchema: obj({ id: { type: "string" } }, ["id"]),
  },
];

const text = (value: unknown): McpToolResult => ({
  content: [
    {
      type: "text",
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

const fail = (message: string): McpToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/** Execute a tool by name. Validates required args; never throws on bad input. */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
  deps: McpToolDeps
): Promise<McpToolResult> {
  switch (name) {
    case "list_components":
      return text(await deps.listComponents());
    case "list_projects":
      return text(await deps.listProjects());
    case "get_project_data": {
      if (typeof args.id !== "string")
        return fail("`id` (string) is required.");
      const data = await deps.getProjectData(args.id);
      return data ? text(data) : fail(`No project with id "${args.id}".`);
    }
    case "set_project_data": {
      if (typeof args.id !== "string")
        return fail("`id` (string) is required.");
      if (typeof args.data !== "object" || args.data === null)
        return fail("`data` (object) is required.");
      const ok = await deps.setProjectData(args.id, args.data as ProjectData);
      return ok
        ? text(`Updated project "${args.id}".`)
        : fail("No such project.");
    }
    case "create_project": {
      if (typeof args.title !== "string")
        return fail("`title` (string) is required.");
      return text(await deps.createProject(args.title));
    }
    case "build_project": {
      if (typeof args.id !== "string")
        return fail("`id` (string) is required.");
      const out = await deps.buildProject(args.id);
      return out ? text(out) : fail("Build failed (desktop only, or no data).");
    }
    default:
      return fail(`Unknown tool: ${name}`);
  }
}
