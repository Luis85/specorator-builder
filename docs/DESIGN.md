# Specorator Builder — Design

> Companion to `REQUIREMENTS.md`. Describes the UX, architecture, data model, and
> subsystem designs. Status: Draft v0.1 (spec-first).

## 1. Product Overview & Personas

Specorator Builder brings a visual web page builder into Obsidian while keeping
the vault the source of truth. The guiding principle — **"the markdown note is
the canonical, openable object; the GrapesJS project JSON is an opaque
sidecar"** — makes the visual work browsable, searchable, linkable, and
diff-able like any other note.

**Personas**

- **Maya — personal-site note-taker.** Wants a landing page / link-in-bio /
  portfolio without leaving the vault or learning HTML. Needs a fast path from
  blank to polished.
- **Devon — docs/spec author.** Wants richer layouts than markdown, but the
  source of truth must stay readable and diff-able in git.
- **Priya — design-system curator.** Owns a reusable component/block library;
  wants to author components once, document them, and reuse them with consistent
  metadata.
- **Sam — agent-assisted builder.** Describes a page in natural language and has
  an agent assemble it via MCP, then opens the builder for visual polish.

## 2. User Journeys

**First run / onboarding.** Install → enable (desktop-only). A "next steps"
checklist modal: confirm component/projects/data folders, "Create your first project",
"Create a sample component". Empty states carry onboarding: an empty canvas shows
a drop target ("Drag a block here or open the Blocks panel"); an empty library
shows "No components yet — create one".

**Create a project.** Command "Create project" → name/folder prompt → plugin
writes the paired Project Note (frontmatter + body) with a stable `id` and a
seeded project-JSON data file, then opens the builder leaf. Add/rename pages via
GrapesJS PageManager. Opening the Project Note later offers "Open in builder"; the
data file is de-emphasized.

**Author a component → block.** Priya creates one note in the library folder
(frontmatter + ` ```html `/` ```css ` fences + docs). The plugin watches the
folder and live-updates the Blocks panel, with a per-note "registered as block X"
indicator and inline validation on bad frontmatter.

**Edit visually + save.** GrapesJS autosaves through the custom storage backend
to the data file (debounced, atomic); the status bar shows Saving…/Saved.

**Preview.** "Start preview" boots the local webserver; "Open preview" shows it in
a Web Viewer tab beside the editor (or the system browser).

**Export / publish.** "Export page" / "Build site" render to static HTML/CSS;
"Reveal in file explorer" opens the output. "Publish to Astro" hands off to the
sibling.

**Agent-assisted (MCP).** With the MCP server enabled, an agent lists components,
creates/edits pages and component notes, sets project data, builds, and controls
preview — then the human opens the leaf to polish. A conflict model handles
agent-vs-open-editor writes (D-4).

## 3. Architecture (Ports & Adapters)

GrapesJS is DOM-bound, so it lives in an adapter, never in core. Core stays pure
and Vitest-able.

```
src/
  core/
    domain/         Page, ComponentDef, ProjectData (opaque JSON), Settings types
    usecases/       ScanLibrary, ResolveComponentBlocks, CreatePage, LoadPage,
                    SavePage, BuildPage, BuildSite, InstallClaudeAssets
    ports/          interfaces (below)
    parsing/        frontmatter split + fenced-block extraction (pure functions)
    html/           buildHtmlDocument, buildIndexHtml (pure)
  adapters/
    obsidian/       ProjectStore, LibraryScanPort, SettingsPort,
                    ViewerPort (Web Viewer)
    editor/         GrapesEditorAdapter (interactive + headless RendererPort),
                    storagePlugin, blockFactory
    server/         PreviewServer (Node http), McpServerAdapter (Streamable HTTP)
    process/        ProcessPort impl (spawn/kill, SIGTERM→SIGKILL)
    claude/         ClaudeAssetInstaller (.claude/ + .mcp.json writer)
  ui/
    BuilderView.ts  ItemView hosting GrapesJS
    SettingsTab.ts  settings (single source of truth)
    modals.ts       onboarding, create-page/component, consent dialogs
  main.ts           composition root
  styles/specorator.css
docs/REQUIREMENTS.md  docs/DESIGN.md
esbuild.config.mjs    manifest.json    versions.json    (vitest.config.ts later)
```

**Ports** (reviewed with the deep-module/seam lens — see `CONTEXT.md` and
`docs/adr/`)

| Port | Responsibility | Seam status |
|------|----------------|-------------|
| `ProjectStore` | Owns a Project as *note + JSON data file kept consistent*: `create / load / saveData / list`, atomic writes. | Deep (merges the former VaultPagePort + NoteIndexPort — ADR-0008/0011). |
| `LibraryScanPort` | Enumerate + read component notes; emit debounced change events. | Real (core's `ScanLibrary` depends on it). |
| `SettingsPort` | Load/save versioned settings; provide the settings UI surface. | Retained (ADR-0010). |
| `RendererPort` | `render(projectData) → {html, css}` headless build; hides all of GrapesJS. | Deep (renamed from EditorPort for clarity). |
| `PreviewServerPort` | Start/stop/status the local static webserver. | Retained (ADR-0010). |
| `McpServerPort` | Start/stop/status the opt-in MCP server. | Retained (ADR-0010). |
| `ViewerPort` | Open a URL in Web Viewer; fall back to system browser. | Confirmed seam — two adapters (Web Viewer + browser). |
| `ProcessPort` | Spawn/terminate child processes (SIGTERM→timeout→SIGKILL). | Reserved — no adapter yet; kept as an anticipated seam (ADR-0010). |

The **interactive** editor is distinct from the headless `RendererPort`: the
`GrapesEditorAdapter` + `storagePlugin` live in `adapters/editor` and are wired by
the view (not by core). `RendererPort` is only the headless render seam used by
the build use-cases.

## 4. Data Model & Schemas

### 4.1 Component note (flat props + tag — ADR-0012)

```yaml
---
tags: [specorator/component]   # the marker
label: Hero CTA                # default: note title
category: Sections             # default: "Components"
icon: layout                   # lucide name | emoji | inline svg
block-id: hero-cta             # default: slug of filename; stable
---
```

Body (human docs + machine source):

````md
Reusable hero with a heading and call-to-action button.

```html
<section class="sp-hero sp-hero--light">
  <h1 class="sp-hero__title">Welcome</h1>
  <a class="sp-hero__cta" href="#">Get started</a>
</section>
```

```css
.sp-hero { padding: 4rem 1rem; text-align: center; }
.sp-hero__cta { display: inline-block; padding: .75rem 1.5rem; }
```
````

The plugin registers `Blocks.add(blockId, { label, category, media, content })`
where `content` is the ` ```html ` fence verbatim **plus** the ` ```css ` fence
wrapped in a `<style>` tag, so GrapesJS imports the CSS into Project CSS on drop
(present only where used). Collisions are avoided by the component-prefixed class
convention (`.sp-*`), checked by `sb-lint-library`. An optional ` ```astro ` fence
the independent Astro sibling can consume is ignored by Builder.

### 4.2 Project note (flat props + tag — ADR-0011/0012)

```yaml
---
tags: [specorator/project]     # the marker
id: 9f3a2c                      # stable Project Id (binds to the data file)
title: My Site
home: home                      # which page is "/"
status: draft
data-file: Specorator/.data/9f3a2c.gjs.json   # hidden dot-folder (adapter API)
updated: 2026-05-25
---
```

Body: user documentation + an **auto-generated**, clearly-marked read-only **Page
Index** — one snapshot section per GrapesJS page (under `## Pages (auto-generated
— do not edit)`), derived from `getHtml`/`getCss` (ADR-0006). Never parsed back.

### 4.3 Project data & settings

`data-file` holds verbatim `editor.getProjectData()` JSON. Settings (via
`loadData`/`saveData`) hold folder paths, ports, the three consent grants, the
MCP token, Claude-asset toggles, and a schema version (with forward migration).

## 5. Subsystem Designs

### 5.1 GrapesJS embedding

- **Interactive view.** `BuilderView extends ItemView` builds a container with
  `createDiv` (no `innerHTML`); `onOpen` lazy-imports grapesjs and calls
  `grapesjs.init({ container, plugins: [storagePlugin, gjsPresetWebpage,
  gjsBlocksBasic], storageManager: { type: 'specorator', autosave: true,
  autoload: true, stepsBeforeSave: N } })`. `onClose` calls `editor.destroy()`
  and nulls the ref. The editor instance lives on the view, never on the plugin;
  locate views via `getLeavesOfType`. Component-block markup/CSS is injected into
  the canvas iframe via GrapesJS config, not the host document.
- **Headless render** (`RendererPort` impl): `grapesjs.init({ headless: true,
  container: detachedDiv })` → `loadProjectData(json)` → `getHtml()`/`getCss()` →
  `destroy()`. Works in Obsidian's Electron renderer (has `window`/`document`);
  never attempt this in a pure Node child process without jsdom.

### 5.2 Persistence wiring

`ProjectStore` (ADR-0008/0011) owns the whole persistence invariant — Project Note + JSON
data file kept consistent — so callers never juggle the two halves.

- Register storage **before init** as a plugin function:
  `(editor) => editor.Storage.add('specorator', { load: () =>
  pageStore.loadData(pageId), store: (data) => pageStore.saveData(pageId, data)
  })`, with `pageId` bound per editor.
- `ProjectStore.saveData` writes the JSON (plugin-managed, non-markdown) via the
  adapter API + `normalizePath` with an **atomic** temp-write + rename, then
  refreshes the Project Note's Page Index via the Vault API
  (`create` / `Vault.process`) so Obsidian tracks/links it.
- Debounce `store` (~1–2 s) and skip writes when `getDirtyCount()` is 0.

### 5.3 Preview webserver

- Node `http` static server: `server.listen(port, '127.0.0.1')`; on `EADDRINUSE`,
  increment and retry up to N; serve from the export dir with a small MIME map;
  `/` → `index.html`; 404 otherwise. `server.close()` in `onunload`.
- Open via `ViewerPort`: detect `app.internalPlugins.getPluginById('webviewer')
  ?.enabled`; if enabled, `setViewState({ type: 'webviewer', state: { url,
  navigate: true }, active: true })` (reuse an existing preview tab); else
  `window.open(url)` / Electron `shell.openExternal`.
- Later: a ` /__reload ` SSE endpoint + a ~10-line injected script for live
  refresh on re-export.

### 5.4 Export / build

- Render in the renderer via headless GrapesJS (§5.1). Per page: select root,
  `getHtml({component})` + `getCss({component})`, wrap in an HTML template.
- Write `dist/<slug>/index.html` + a generated index linking all pages. Copy
  referenced vault images into `dist/assets/` and rewrite URLs (vault
  `app://`/absolute paths don't resolve under the static server); dedupe via a
  src→dist map. Provide Export + Reveal actions.

### 5.5 MCP server

- **Transport/connection.** In-process **Streamable HTTP** (`@modelcontextprotocol
  /sdk` v1.x) bound to `127.0.0.1:<port>`, single `/mcp` endpoint. The
  GUI-app-can't-be-a-stdio-child constraint rules out stdio for the always-running
  plugin. Claude Code connects directly:
  `claude mcp add --transport http specorator http://127.0.0.1:<port>/mcp
  --header "Authorization: Bearer <token>"` (omit `--header` when the optional
  token is disabled). stdio-only clients (e.g. Claude
  Desktop) use the standard `npx mcp-remote` shim — no custom bridge binary
  needed. The settings tab shows the live snippet.
- **Tools.** `list_components`, `read_component`, `create_component`,
  `update_component`, `search_components`, `list_pages`, `read_page`,
  `create_page`, `update_page`, `get_page_project_data`,
  `set_page_project_data` (schema-validated + backup-before-write),
  `render_page_html`/`export_page`, `build_site`, `start_preview_server`,
  `stop_preview_server`, `get_preview_status`.
- **Resources.** `specorator://components/{id}`, `specorator://pages/{id}`,
  `specorator://pages/{id}/project-data`, `specorator://build/{file}`.
- **Prompts.** `scaffold_page` (build from library components), `audit_page`.
- **Write-conflict model (ADR-0009).** Disk is the source of truth. When an MCP
  tool writes a page (or component) that is currently open in a builder leaf,
  `ProjectStore` emits a change the view detects and the user is prompted to
  **reload from disk**; the on-disk write wins, and the editor never silently
  clobbers the agent's change. `set_page_project_data` always validates and
  backs up before writing.
- **Security/lifecycle.** Default-off; consent dialog on first enable.
  Always-on, zero-friction protection: bind `127.0.0.1` + validate
  `Origin`/`Host` (this is what stops a malicious browser tab from POSTing to the
  local port — the only realistic remote-ish attack). **Optional** regenerable
  bearer token (recommended, default-on, one-click disable) for defense against
  other local processes — not required for a trusted single-user machine.
  Configurable port with conflict detection; path-scope all file tools to
  Specorator folders; status indicator; `httpServer.close()` in `onunload`. The
  settings snippet includes the `Authorization` header only when the token is
  enabled.

### 5.6 Opt-in skills, subagents & commands

- **Install model.** On opt-in (default-off settings toggle), idempotently write
  plugin-owned assets into the vault's **project-scope** `.claude/` directory and
  an asset-version marker (`.claude/.specorator-assets-version`); refresh on
  upgrade; remove on disable/uninstall (confirmation). Warn (don't clobber) on
  name collisions with pre-existing user assets. Project scope is preferred over
  `~/.claude` (isolation, vault-versionable, auto-discovered).
- **MCP wiring.** Auto-write a project `.mcp.json` using the **HTTP transport** +
  token (not stdio); assets degrade gracefully with a clear "enable the MCP
  server" message when it's off, optionally probing health via dynamic context
  injection.
- **Catalog (initial).**

  | Kind | Name | Purpose |
  |------|------|---------|
  | subagent | `specorator-builder` | Knows the MCP tool surface + component-note conventions; drives builds. |
  | subagent | `component-auditor` | Accessibility/code-quality review of components (read-only tools). |
  | skill/cmd | `sb-new-component` | Scaffold a well-formed component note. |
  | skill/cmd | `sb-new-page` | Create a page; optionally populate from library components. |
  | skill/cmd | `sb-preview` | Start/stop preview server; return URL. |
  | skill/cmd | `sb-export-page` | Export current page to HTML; return preview link. |
  | skill/cmd | `sb-build-site` | Build all pages to static HTML. |
  | skill/cmd | `sb-audit-page` | Audit a page for accessibility/SEO/responsiveness (forked). |
  | skill/cmd | `sb-lint-library` | Scan the library for naming/frontmatter/structure issues. |
  | skill/cmd | `sb-refactor-component` | Refactor a component and update dependents (forked). |

  Side-effecting commands are user-invocable (`disable-model-invocation: true`);
  audit/lint may be model-invocable.

### 5.7 UI surfaces

- **Workspace leaf:** the GrapesJS canvas + native panels (the only inherently
  non-Obsidian surface; themed to Obsidian variables).
- **Ribbon:** one icon → open the active Project Note in the builder, else "Create project".
- **Command palette:** the full command set (REQUIREMENTS FR-35).
- **Settings tab:** single source of truth (FR-36) with contextual help and the
  consent toggles.
- **Status bar:** save state; preview running; MCP running.
- **Context menus:** component note → "Register/refresh as block"; Project Note →
  "Open in builder", "Preview".

## 6. Optional Astro Interop (no dependency)

Specorator Builder is standalone and requires no other plugin. For users who
*also* run `specorator-astro`, an **optional, later** exporter can bridge them —
sharing **files only, never processes or runtime**, and only if the user opts in:

- **Components:** our own note convention (§4.1) optionally carries an extra
  ` ```astro ` fence the sibling can read; Builder neither produces nor requires
  it by default.
- **Pages:** Builder's project JSON is authoritative; a "Publish to Astro" action
  (FR-39) could emit an HTML partial + frontmatter page-note for the sibling. One
  way, file-based, no installed-plugin assumption.
- Pick default ports unlikely to collide with common dev servers (incl. Astro's
  4321) so both coexist if present.
- If/when this exporter is built, verify the sibling's frontmatter keys + fence
  language against its source (R-7). Off the critical path.

## 7. Build Tooling

- esbuild → `main.js` (CJS), externals: `obsidian`, `electron`, node builtins,
  `@codemirror/*`/`@lezer/*`. A build step concatenates `grapes.min.css` + plugin
  CSS into Obsidian's single `styles.css` (the preset/blocks plugins inject their
  own CSS via JS). Scope bundled GrapesJS CSS under the view container to avoid
  leaking into Obsidian's UI. Lazy-import grapesjs on first builder open.
- Decide on the code-export panel vs externalized CodeMirror (R-2).

## 8. Testing Strategy

- **Pure & Vitest-able:** all `core/` use-cases, frontmatter/fence parsing,
  project-JSON↔note-index transforms, path normalization, HTML builders. Ports
  are interfaces → stub as plain objects.
- **Stub `obsidian`** via a Vitest `resolve.alias` for the rare adapter unit test.
- **`GrapesEditorAdapter`** (DOM/iframe) is integration-tested manually; headless
  render output fidelity is validated against golden fixtures (R-1).
- A single `npm run verify` runs typecheck → lint → test → build, mirrored in CI.

## 9. Roadmap (see REQUIREMENTS §7 for the full MVP/Later split)

1. **M1 — Builder core:** view + GrapesJS + persistence + create/open/save.
2. **M2 — Library:** folder scan → blocks, live refresh, save-selection-as-
   component.
3. **M3 — Preview & export:** webserver + Web-Viewer open; headless multi-page
   build + Export/Reveal.
4. **M4 — Agentic:** opt-in MCP server.
5. **M5 — Assets:** opt-in Claude skills/subagents/commands installer.
6. **M6 — Suite:** Publish-to-Astro contract; parametric components; live-reload;
   accessibility & templates.

## 10. Open Decisions

Tracked in `REQUIREMENTS.md §8` (D-1…D-6 and R-1…R-8). The most consequential for
implementation order: page data-file placement (D-1), publish ownership (D-3),
and the MCP concurrency model (D-4).
