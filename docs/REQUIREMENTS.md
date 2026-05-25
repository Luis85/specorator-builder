# Specorator Builder — Requirements

> Status: Draft v0.1 — spec-first. No feature code is written yet beyond the
> build scaffolding. This document and `DESIGN.md` are the source of truth for
> what gets built and are kept current as the design evolves.

## 0. Overview & Scope

**Specorator Builder** is a desktop-only Obsidian plugin that embeds
[GrapesJS](https://github.com/GrapesJS/grapesjs) — an open-source drag-and-drop
visual web page builder — inside an Obsidian vault. Users build web pages
visually; the plugin persists each page in GrapesJS's **native, lossless project
JSON** while exposing a **markdown-native component library** (one note per
component) so the building blocks are browsable, documented, linkable, and
diff-able as ordinary notes.

The plugin also ships, **all opt-in and default-off**:

- a **local preview webserver** to showcase built pages inside Obsidian or the
  system browser;
- a **local MCP server** so AI agents can drive the builder programmatically;
- a bundle of **Claude skills, subagents, and slash commands** that help users
  (and their agents) work with the tool.

### 0.1 Relationship to `specorator-astro` (inspiration, not dependency)

`specorator-astro` is a sibling plugin that turns Obsidian Bases + notes into a
published **Astro** static site, previews it via a `localhost` dev server shown
in Obsidian's **Web Viewer** core plugin, and authors components as markdown
notes. Specorator Builder is **inspired by** it but is **fully independent** — it
does not require, depend on, import, or talk to the Astro plugin, and works
standalone with neither installed.

- It **borrows the sibling's transferable patterns**: ports-and-adapters
  architecture, settings as single source of truth, `isDesktopOnly`, one-time
  consent gates, Web-Viewer-or-browser preview, and clean process teardown.
- It **diverges** on the "native-only / no third-party" stance — embedding
  GrapesJS is the entire premise — but keeps that third-party surface bundled,
  localhost-only, and consent-gated.
- Any interoperability with the Astro plugin (§1.9) is **optional and
  dependency-free**: Specorator Builder defines its own clean component-note
  convention; an optional exporter can emit Astro-friendly output for users who
  also run the sibling, but this is never required and never assumed.

### 0.2 Scope constraints

- **SC-1** Desktop only (`isDesktopOnly: true`); all Node/Electron usage guarded
  by `Platform.isDesktop`.
- **SC-2** No outbound network. All servers bind to `127.0.0.1`. GrapesJS and all
  runtime code are **bundled** — never fetched from a CDN, no self-update.
- **SC-3** No telemetry of any kind.
- **SC-4** All vault writes are confined to configured Specorator folders via
  `normalizePath`; path traversal/absolute escapes are rejected.

---

## 1. Functional Requirements

### 1.1 Visual Builder & Editor

- **FR-1** Provide a custom workspace view (`ItemView`) that hosts a GrapesJS
  editor instance, opened in its own leaf.
- **FR-2** Bundle GrapesJS (`grapesjs`) plus `grapesjs-preset-webpage` and
  `grapesjs-blocks-basic`, and enable the core managers needed for a credible
  builder: Block, Style, Layer, Trait/Selector, Device (responsive
  breakpoints), Panels, and a read-capable code view.
- **FR-3** Theme the editor chrome to the active Obsidian theme (light/dark) via
  CSS variables; the GrapesJS `.gjs-*` namespace must not leak into Obsidian's
  own UI (scope bundled CSS to the view container).
- **FR-4** Support multiple GrapesJS pages within a single project (PageManager),
  and multiple open builder leaves (bounded — see NFR-2/risks).
- **FR-5** Provide undo/redo, responsive/device preview, and the standard
  GrapesJS editing affordances out of the box.

### 1.2 Persistence — Pages & Project Data

- **FR-6** Persist each page as GrapesJS **native project JSON**
  (`editor.getProjectData()`) in a dedicated vault data file. This is the
  lossless source of truth. HTML/CSS export (`getHtml`/`getCss`) is **one-way**
  and must never be used as a persistence/round-trip layer.
- **FR-7** Pair each page with a human-readable markdown **page note**
  (frontmatter + body) that documents/indexes the page and links to its data
  file. The **page note is the user-facing canonical object** users open,
  search, link, and review; the JSON data file is a de-emphasized sidecar.
- **FR-8** Save via a custom GrapesJS Storage Manager backend
  (`editor.Storage.add('specorator', { load, store })`, registered before init
  so autoload works), with debounced autosave and dirty-count checks to skip
  no-op writes. Writes must be atomic (temp-write + rename) to survive a crash
  mid-save.
- **FR-9** Provide commands to create a page (writes the paired note + seeded
  data file and opens the builder), open an existing page note in the builder,
  and save.
- **FR-10** Optionally write an auto-generated, clearly-marked read-only HTML/CSS
  snapshot region into the page-note body for at-a-glance review and git diffs;
  never parse it back as a source.

### 1.3 Component Library — One Note Per Component

- **FR-11** Treat a configurable vault folder (default `Specorator/Components`)
  as the component library. Each markdown note that opts in via frontmatter
  defines exactly one reusable GrapesJS block.
- **FR-12** A component note carries block metadata in frontmatter (id, label,
  category, icon, optional params) and its markup/styles + human-readable
  documentation in the body (§4.1). The note must render cleanly in Obsidian
  reading view.
- **FR-13** Scan the library folder and register each component as a draggable
  GrapesJS block (`editor.Blocks.add`). Prefer a Component Definition with a
  scoped `styles` string over an embedded `<style>` tag (GrapesJS guidance).
- **FR-14** Live-refresh: watch the library folder (debounced) and add/update/
  remove blocks as notes change, with visible validation feedback on malformed
  frontmatter and a per-note "registered as block X" indicator.
- **FR-15** Provide "Save selection as component": export the selected component
  from the builder (its HTML + scoped CSS) into a new, well-formed component
  note, closing the authoring loop.
- **FR-16** (Later) Support parametric components: map declared `params` to
  GrapesJS traits / custom component types.

### 1.4 Local Preview Webserver

- **FR-17** Provide an opt-in, default-off local **static webserver** (Node
  `http`) that serves the exported site, bound to `127.0.0.1` on a configurable
  port with auto-fallback on `EADDRINUSE`.
- **FR-18** Open the preview inside Obsidian via the **Web Viewer** core plugin
  (`setViewState({ type: 'webviewer', state: { url, navigate: true } })`),
  detecting whether it is enabled; fall back to the system browser otherwise.
- **FR-19** Lifecycle: start/stop commands, a visible "preview running" status,
  and guaranteed `server.close()` in `onunload`.
- **FR-20** (Later) Live-reload via a tiny injected SSE script that refreshes the
  preview tab on re-export.

### 1.5 Export & Build Pipeline

- **FR-21** Export a page to standalone HTML/CSS by rendering its project JSON
  through a **headless** GrapesJS instance in the renderer (init on a detached
  element → `loadProjectData` → `getHtml`/`getCss` → `destroy`).
- **FR-22** Build the whole site: iterate all page notes, render each page, write
  `dist/<slug>/index.html`, generate an index page linking all pages, and copy
  referenced vault assets into `dist/assets/` with rewritten relative URLs.
- **FR-23** Provide Export and **Reveal in file explorer** actions
  (`shell.showItemInFolder`).
- **FR-24** Output location is configurable; defaults outside the indexed vault
  content where practical, while remaining servable by the preview webserver.

### 1.6 Opt-in Local MCP Server

- **FR-25** Ship an **opt-in, default-off** local MCP server using
  **Streamable HTTP** bound to `127.0.0.1` on a configurable port. **Mandatory,
  zero-friction** protection: bind localhost-only + validate `Origin`/`Host`
  (defeats browser DNS-rebinding/CSRF against the local port). An **optional**
  regenerable **bearer token** (recommended, default-on, one-click disable) adds
  defense against other local processes; it is not required for a trusted
  single-user machine.
- **FR-26** Expose a tool surface mapping to builder capabilities (§5.2 of
  DESIGN): list/read/create/update component notes; search components; list/
  create/read/update pages; get/set a page's project JSON (validated +
  backup-before-write); render/export a page; trigger a build; start/stop/status
  the preview server.
- **FR-27** Expose **resources** (`specorator://components/{id}`,
  `specorator://pages/{id}`, `.../project-data`, `specorator://build/{file}`) and
  optional **prompts** (e.g., scaffold a page from library components).
- **FR-28** All MCP file operations are **path-scoped** to the configured
  Specorator folders; traversal/absolute escapes are rejected.
- **FR-29** Lifecycle: start/stop via settings toggle and commands; visible
  status; clean shutdown in `onunload`. Display the exact client config snippet
  (live port + token) for Claude Code (`--transport http`) and for stdio-only
  clients via `mcp-remote`.

### 1.7 Opt-in Skills, Subagents & Commands

- **FR-30** Ship a bundle of Claude **skills**, **subagents**, and **slash
  commands** that help users and agents work with the builder, installed
  **opt-in, default-off** from plugin settings.
- **FR-31** On opt-in, install assets idempotently into the vault's project-scope
  `.claude/` directory (`.claude/skills/<name>/SKILL.md`,
  `.claude/agents/<name>.md`, `.claude/commands/<name>.md`), record an asset
  version marker, and on disable/uninstall remove them (with confirmation).
- **FR-32** Do not overwrite pre-existing user assets of the same name without
  warning; on plugin upgrade, refresh plugin-owned assets and surface that
  manual edits to plugin-owned files are replaced.
- **FR-33** Assets reference the opt-in MCP server (via an auto-written project
  `.mcp.json` using the **HTTP transport** + token) and degrade gracefully with
  a clear message when the MCP server is off.
- **FR-34** Ship at minimum: a `specorator-builder` subagent that knows the MCP
  tool surface and the component-note conventions; skills/commands to create a
  component, create/scaffold a page, preview, export, build, and audit/lint
  (full catalog in DESIGN §6).

### 1.8 UI, Commands & Settings

- **FR-35** Provide a ribbon icon, a command-palette command set (create/open
  page, create component, start/stop preview, open preview, export page, build
  site, start/stop MCP server, refresh library, install/remove Claude assets),
  a status bar (save state, preview/MCP running), and relevant context-menu
  actions on page/component notes.
- **FR-36** Provide a settings tab as the **single source of truth**: folder
  paths (components, pages, data, output), preview port, autosave cadence, the
  three consent toggles (webserver / MCP / component code execution), MCP port +
  token controls, and Claude-asset install toggles. Settings are
  schema-versioned with forward migration.
- **FR-37** Provide first-run onboarding: a "next steps" checklist (set folders,
  create first page, create a sample component) and strong empty states (drop
  target on an empty canvas; "create one" prompts for empty library/pages).

### 1.9 Optional Astro Interop (no dependency)

These are **optional, default-off, and never required**. Specorator Builder is
fully functional with no Astro plugin present.

- **FR-38** Define our **own** clean component-note convention (§4.1). It MAY be
  designed to be compatible with `specorator-astro`'s note format where that
  costs nothing, but compatibility is a convenience, not a contract.
- **FR-39** (Later, optional) Provide a "Publish to Astro" export that emits
  Astro-friendly HTML partials + frontmatter notes for users who also run the
  sibling. This is a one-way file export with no runtime coupling, no shared
  process, and no installed-plugin assumption.

---

## 2. Non-Functional Requirements

- **NFR-1 Platform.** Desktop only; guard all Node/Electron APIs with
  `Platform.isDesktop`. Lazy-load GrapesJS on first builder open so plugin
  startup stays cheap.
- **NFR-2 Performance.** Debounce library re-scans (~300–500 ms) and autosave
  (~1–2 s); cache parsed component notes by path+mtime and re-register only
  changed blocks; target usability on large vaults (~10k notes). Bound the
  number of concurrently open builder leaves (each is an iframe editor and is
  memory-heavy).
- **NFR-3 Reliability.** Atomic project-JSON writes (temp + rename). Never lose
  user work on crash; show explicit "Saving…/Saved" state. Kill all spawned
  servers/listeners on `onunload` and on plugin disable.
- **NFR-4 Security & Privacy.** See §5. Localhost-only, default-off, token-auth,
  consent-gated, no telemetry, no remote code. Disclose all out-of-vault file
  access and the local-listener behavior in the README.
- **NFR-5 Persistence & Cleanup.** Settings + any sidecar files are
  schema-versioned with forward migration. Regeneration/install writes only into
  plugin-owned locations; never deletes user content. Uninstall offers
  confirmation-gated cleanup of generated/installed assets.
- **NFR-6 Quality gates.** TypeScript strict + `tsc --noEmit`; Prettier; ESLint
  (with `eslint-plugin-obsidianmd`); Vitest for the pure `core/`; a single
  `npm run verify` aggregating typecheck → lint → test → build, mirrored in CI.
- **NFR-7 Accessibility.** GrapesJS drag-and-drop is mouse-centric — a known
  gap. Mitigate: every action reachable via command palette; block insertion
  also possible via the Layers panel / an "insert block" command; respect
  Obsidian contrast/font-size variables. Document the limitation honestly.
- **NFR-8 Licensing.** Plugin is MIT. GrapesJS is BSD-3-Clause (compatible);
  ship a `NOTICES`/third-party attribution file retaining the GrapesJS copyright
  and not using its name to endorse the product. Do not bundle the commercial
  GrapesJS Studio SDK.
- **NFR-9 Compatibility.** `minAppVersion` set high enough for programmatic Web
  Viewer (≈ 1.8.x). Document the minimum Claude Code version required for the
  shipped skills/agents.

---

## 3. Architecture Requirements

- **ARCH-1 Ports & adapters.** A pure **`core/`** layer (domain entities,
  use-cases, port interfaces) with **no imports of `obsidian`, Node, or
  `grapesjs`** — unit-testable with Vitest. An **`adapters/`** layer is the only
  place (besides `main.ts`) allowed to import `obsidian`/Node/GrapesJS. `main.ts`
  is the composition root.
- **ARCH-2 GrapesJS is an adapter.** Because GrapesJS is DOM-bound, the editor
  integration lives in an `EditorAdapter` implementing an `EditorPort`
  (`render(projectData) → { html, css }` for headless builds), so core never
  depends on GrapesJS.
- **ARCH-3 Named ports** (see DESIGN §3): VaultPagePort, NoteIndexPort,
  LibraryScanPort, SettingsPort, EditorPort, PreviewServerPort, McpServerPort,
  ProcessPort, ViewerPort.
- **ARCH-4 Boundaries.** Keep boundaries clean by convention for v1; optionally
  enforce later with `eslint-plugin-boundaries` + `dependency-cruiser`.

---

## 4. Data Model & Schemas

Concrete YAML and examples live in `DESIGN.md §4`. Summary of the canonical
artifacts:

### 4.1 Component-note convention

Specorator Builder's own convention: a top-level `component:` frontmatter map
(id, label, category, icon, params) plus **language-distinguished fenced code
blocks** in the body — ` ```html ` + ` ```css ` consumed by Builder. The prose
around the fences is real documentation. Optionally, a note may also carry a
` ```astro ` fence that the independent Astro sibling can consume if the user
runs it; Builder ignores fences it doesn't understand. This optional
compatibility imposes no dependency.

### 4.2 Page note

Frontmatter marks the note as a Specorator page and links to its project-JSON
data file (`data_file`), with `title`, `slug`/route, and `status`. Body is
documentation plus the optional auto-generated snapshot region.

### 4.3 Project data

Verbatim `editor.getProjectData()` JSON in the linked data file. Opaque to the
core domain (treated as a JSON blob); only the `EditorAdapter` interprets it.

### 4.4 Settings

Plugin settings (via `loadData`/`saveData`) hold folder paths, ports, consent
grants, MCP token, Claude-asset toggles, and a schema version.

---

## 5. Security & Consent Model

- **SEC-1** Three independent, **default-OFF**, revocable consent gates, each
  behind a one-time disclosure dialog that names the capability, scope, data
  locality, and worst case — and never claims a sandbox:
  1. **Preview webserver** (local listener serving built pages).
  2. **MCP server** (local listener that lets connected agents read/write
     Specorator files and trigger builds — RCE-class).
  3. **Component code execution** (components may contain HTML/CSS/JS that the
     plugin executes and serves — RCE-class).
- **SEC-2** All listeners bind `127.0.0.1` only (never `0.0.0.0`) and validate
  `Origin`/`Host` (always-on, zero-friction; this is what defeats the realistic
  browser-based local attack). The MCP endpoint additionally supports an
  **optional** regenerable bearer token (recommended on; defends against other
  local processes) and a configurable port with conflict detection.
- **SEC-3** Scope every file operation (plugin, MCP, and installed assets) to the
  configured Specorator folders via `normalizePath`; reject traversal.
- **SEC-4** Bundle all code (no CDN, no self-update). Plugin chrome uses
  `createEl`/DOM APIs (no `innerHTML` in plugin-owned UI; GrapesJS's internal DOM
  handling stays within the editor/served output).
- **SEC-5** Re-prompt consent when the settings schema/trust model changes.
  Persist grants in versioned settings; revoke = toggle off + invalidate token +
  stop listener.

---

## 6. Distribution Requirements

- **DIST-1** `manifest.json`: `isDesktopOnly: true`; id without "obsidian";
  Basic-Latin name without "Obsidian"; description ≤250 chars ending in a period,
  no emoji; correct `minAppVersion`.
- **DIST-2** Root `versions.json` mapping plugin version → `minAppVersion`.
- **DIST-3** GitHub releases attach `main.js`, `manifest.json`, `styles.css`;
  semver tag **without** a leading `v`; tag matches manifest version.
- **DIST-4** `README.md` (security section: localhost-only, no outbound network,
  out-of-vault access, MCP/agent capability, no telemetry, desktop-only
  justification), `LICENSE` (MIT), and `NOTICES` (GrapesJS BSD-3 attribution).
- **DIST-5** BRAT for beta distribution prior to/while in community-directory
  review. Remove all sample/boilerplate code before submission.

---

## 7. Phasing — MVP vs Later

**MVP**
- Builder view + GrapesJS (preset-webpage, blocks-basic, Style/Layer/Device/
  Block/Trait managers, read code view), Obsidian theming.
- Page persistence: custom storage adapter, paired page note + JSON data file,
  debounced atomic autosave; create/open/save commands.
- Component library: folder scan → blocks (HTML-string content), live refresh,
  validation feedback, "save selection as component".
- Local preview webserver (127.0.0.1, port fallback) + Web-Viewer-or-browser
  open; multi-page headless export to `dist/` with index + copied assets;
  Export/Reveal.
- Settings tab (single source of truth), ribbon, command set, status bar,
  first-run checklist, empty states.
- The three consent gates wired (even where their feature is MVP).

**Later**
- Opt-in MCP server (full tool/resource/prompt surface, token, Origin checks).
- Opt-in Claude skills/subagents/commands installer (`.claude/` + `.mcp.json`).
- Parametric components (params → traits / custom types); component usage
  backlinks ("where is this block used"); design-token sync.
- Live-reload (SSE); "Publish to Astro" exporter honoring the shared contract.
- Accessibility improvements (keyboard block insertion, ARIA); templates.

---

## 8. Risks & Open Questions

- **R-1** Headless build fidelity: confirm `getCss()` captures component styles
  in headless mode (some plugin CSS targets the editor chrome, not output).
- **R-2** CodeMirror externalization vs the code-export panel — disable the panel
  or bundle CodeMirror.
- **R-3** Multiple iframe editors are memory-heavy — cap open leaves or share one
  editor that swaps pages.
- **R-4** Web Viewer `'webviewer'` view type is internal/undocumented — guard
  with feature detection and a browser fallback.
- **R-5** Asset path rewriting (vault `app://`/absolute paths) must be copied +
  rewritten for the static server — easy to get subtly wrong.
- **R-6** MCP vs open-editor write conflicts: define a model (last-write-wins vs
  lock vs live-sync + "reload from disk" prompt).
- **R-7** Optional Astro interop only: if/when we add the Astro exporter, verify
  the sibling note schema against its source. Not on the critical path; no
  dependency.
- **R-8** Pick default ports unlikely to collide with common dev servers (incl.
  the Astro sibling's 4321) so things coexist if both happen to run.

### Decisions needing the product owner

- **D-1** Page data-file placement: co-located beside the page note vs a hidden
  sidecar/data folder (git-noise vs discoverability). *Proposed default: a
  configurable `data` subfolder linked from the note.*
- **D-2** Page-note body content: rendered HTML summary vs markdown approximation
  vs just a link. *Proposed default: optional auto-generated read-only snapshot.*
- **D-3** Publish ownership: Builder fully owns its own preview + static HTML
  export (no dependency on anything). *Proposed default: self-sufficient export;
  the optional Astro hand-off (FR-39) is a later, dependency-free convenience.*
- **D-4** MCP concurrency model (R-6).
- **D-5** Claude-asset opt-in granularity: single toggle vs per-category
  (skills/agents/commands). *Proposed default: single toggle in v1.*
- **D-6** Theming depth for the GrapesJS panels (accept the visual seam vs full
  restyle).
