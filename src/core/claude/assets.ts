// Pure generator for the bundled Claude assets (ADR-0015). The adapter writes
// these into the vault's .claude/ directory and merges .mcp.json.

export interface AssetFile {
  /** Vault-relative path. */
  path: string;
  content: string;
}

/** Marker identifying plugin-managed files, so refresh/uninstall is safe. */
export const MANAGED_MARKER = "<!-- specorator-managed: do not remove -->";

const MCP_SERVER_NAME = "specorator";

export interface ClaudeAssetOptions {
  mcpUrl: string;
}

/** The skills/agents/commands files (excludes .mcp.json — see mcpServerEntry). */
export function claudeAssetFiles(): AssetFile[] {
  return [
    {
      path: ".claude/agents/specorator-builder.md",
      content: agent(
        "specorator-builder",
        "Assembles and edits Specorator web projects via the specorator MCP server.",
        `You build web projects inside Obsidian using the **specorator** MCP server.

Workflow:
1. \`list_components\` to see the available blocks, and \`list_projects\` for existing work.
2. \`create_project\` for a new site, or \`get_project_data\` to load one.
3. Edit the GrapesJS project JSON, then \`set_project_data\` to persist it. The
   data is GrapesJS native project JSON — keep it valid; never hand-write HTML as
   the source of truth.
4. \`build_project\` to render the static site.

Prefer composing from existing library components over ad-hoc markup.`
      ),
    },
    {
      path: ".claude/agents/component-auditor.md",
      content: agent(
        "component-auditor",
        "Audits the Specorator component library for consistent, collision-free CSS.",
        `Review component notes in the library folder. For each:
- Confirm the \`specorator/component\` tag and a sensible label/category.
- Check that CSS class names are component-prefixed (e.g. \`.sp-hero__title\`) to
  avoid global collisions (ADR-0012); flag bare/generic selectors.
- Confirm the \`\`\`html and \`\`\`css fences are present and well-formed.

Report issues grouped by note; suggest concrete renames.`
      ),
    },
    {
      path: ".claude/commands/sb-new-project.md",
      content: command(
        "Create a new Specorator project and scaffold a first page.",
        `Use the specorator MCP server to create a new project named "$ARGUMENTS"
(via \`create_project\`), then describe a sensible first page and persist it with
\`set_project_data\`. Finish by calling \`build_project\` and reporting the result.`
      ),
    },
    {
      path: ".claude/commands/sb-add-component.md",
      content: command(
        "Add a reusable component note to the library.",
        `Author a new component note for "$ARGUMENTS": a markdown file tagged
\`specorator/component\` with flat \`label\`/\`category\`/\`icon\` properties and
\`\`\`html / \`\`\`css fences. Use component-prefixed class names. Place it in the
configured components folder.`
      ),
    },
    {
      path: ".claude/skills/sb-lint-library/SKILL.md",
      content: skill(
        "sb-lint-library",
        "Lint Specorator component notes for tag, schema, and CSS-naming issues.",
        `When asked to lint or audit the component library:
1. Enumerate component notes (tag \`specorator/component\`) in the components folder.
2. For each, verify: the tag marker; a non-empty \`\`\`html fence; component-prefixed
   CSS selectors (no bare element or generic class selectors that risk global
   collisions); a label and category.
3. Output a per-note checklist of pass/fail and suggested fixes.`
      ),
    },
  ];
}

/** The JSON entry for our MCP server, merged into .mcp.json by the adapter. */
export function mcpServerEntry(opts: ClaudeAssetOptions): {
  name: string;
  config: Record<string, unknown>;
} {
  return {
    name: MCP_SERVER_NAME,
    config: { type: "http", url: opts.mcpUrl },
  };
}

/** Merge our server into an existing .mcp.json string (or create one). */
export function mergeMcpConfig(
  existing: string | null,
  opts: ClaudeAssetOptions
): string {
  let root: { mcpServers?: Record<string, unknown> } = {};
  if (existing) {
    try {
      root = JSON.parse(existing);
    } catch {
      root = {};
    }
  }
  const entry = mcpServerEntry(opts);
  root.mcpServers = { ...(root.mcpServers ?? {}), [entry.name]: entry.config };
  return JSON.stringify(root, null, 2) + "\n";
}

/** Remove our server from a .mcp.json string; null if nothing remains. */
export function removeMcpConfig(existing: string | null): string | null {
  if (!existing) return null;
  let root: { mcpServers?: Record<string, unknown> };
  try {
    root = JSON.parse(existing);
  } catch {
    return existing;
  }
  if (root.mcpServers) delete root.mcpServers[MCP_SERVER_NAME];
  return JSON.stringify(root, null, 2) + "\n";
}

function agent(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n${MANAGED_MARKER}\n\n${body}\n`;
}

function command(description: string, body: string): string {
  return `---\ndescription: ${description}\n---\n${MANAGED_MARKER}\n\n${body}\n`;
}

function skill(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n${MANAGED_MARKER}\n\n${body}\n`;
}
