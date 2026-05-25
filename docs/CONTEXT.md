# CONTEXT — Ubiquitous Language

> The shared vocabulary for Specorator Builder. Use these exact terms in code,
> docs, commits, and reviews so reasoning stays consistent. This file is
> maintained alongside `REQUIREMENTS.md`, `DESIGN.md`, and the records in
> `docs/adr/`. When a new concept appears or a fuzzy term is sharpened, update
> this file in the same change.

## Domain language

- **Page** — a single web page the user builds visually. Materialised as a
  *Page Note* plus a *Project Data* file (see *PageStore*).
- **Page Note** — the user-facing markdown note that **is** the canonical,
  openable object for a page: frontmatter (`specorator: page`, `title`, `slug`,
  `data_file`, `status`) + a body of user docs and an auto-generated *Snapshot*.
- **Project Data** — GrapesJS's native, lossless project JSON
  (`editor.getProjectData()`): pages, component tree, styles, assets. The source
  of truth for editing. Treated as an opaque blob outside the editor adapter.
- **Data File** — the file holding *Project Data*, stored in the hidden
  `Specorator/.data/` subfolder and linked from the *Page Note* via `data_file`.
- **Snapshot** — an auto-generated, read-only HTML/CSS region written into the
  *Page Note* body for at-a-glance reading and git diffs. Never parsed back.
- **Component** — a reusable building block draggable in the builder.
- **Component Note** — one markdown note that defines exactly one *Component*:
  `component:` frontmatter (id, label, category, icon, params) + ` ```html `/
  ` ```css ` fences + documentation prose. Lives in the *Library*.
- **Block** — the GrapesJS-registered form of a *Component* (via `Blocks.add`)
  that appears in the editor's Blocks panel.
- **Library** — the configurable vault folder of *Component Notes* (default
  `Specorator/Components`), scanned and live-refreshed into *Blocks*.
- **Builder View** — the Obsidian `ItemView` (workspace leaf) that hosts an
  interactive GrapesJS editor bound to one *Page*.
- **Preview Server** — the opt-in local `127.0.0.1` static webserver that serves
  the exported site for showcase; opened via the *Viewer*.
- **Viewer** — how a preview URL is shown: the Obsidian Web Viewer core plugin
  when enabled, otherwise the system browser.
- **Build / Export** — rendering *Project Data* to static HTML/CSS via headless
  GrapesJS (the *RendererPort*); a *Build* covers all pages + an index + assets.
- **MCP Server** — the opt-in local Streamable-HTTP server letting AI agents
  drive the builder through *Tools*/*Resources*/*Prompts*.
- **Claude Assets** — the opt-in skills, subagents, and slash commands the plugin
  installs into the vault's `.claude/` directory to help users/agents.
- **Consent Gate** — a one-time, default-off, revocable approval for a
  capability with a real trust boundary (Preview Server, MCP Server, executing
  Component code).

## Architecture vocabulary (deep-module lens)

Borrowed from the *improve-codebase-architecture* method; used in reviews.

- **Module** — anything with an interface + an implementation (function, class,
  port, adapter, slice).
- **Interface** — what callers must know: types, invariants, error modes,
  ordering, config.
- **Implementation** — the internal code behind the interface.
- **Depth** — leverage at the interface. *Deep* = lots of behaviour behind a
  small interface (e.g. `RendererPort.render → {html,css}` hiding all of
  GrapesJS). *Shallow* = interface complexity ≈ implementation complexity.
- **Seam** — where an interface lives; lets behaviour change without editing in
  place. *Hypothetical* with one adapter; *confirmed* with two (e.g. `Viewer`:
  Web Viewer + browser).
- **Adapter** — a concrete implementation satisfying an interface at a seam.
- **Port** — a seam the core depends on, expressed as an interface in
  `core/ports`, so the core never imports `obsidian`/Node/`grapesjs`.
- **Leverage** — the caller's benefit from a module's depth.
- **Locality** — the maintainer's benefit: change, bugs, and knowledge stay
  concentrated in one place.
- **Deletion test** — delete a module: if complexity vanishes it was a
  pass-through; if it reappears across callers it earned its keep.
