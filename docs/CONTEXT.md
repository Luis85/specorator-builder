# CONTEXT — Ubiquitous Language

> The shared vocabulary for Specorator Builder. Use these exact terms in code,
> docs, commits, and reviews so reasoning stays consistent. This file is
> maintained alongside `REQUIREMENTS.md`, `DESIGN.md`, and the records in
> `docs/adr/`. When a new concept appears or a fuzzy term is sharpened, update
> this file in the same change.

## Domain language

- **Project** — the canonical unit a user builds: one GrapesJS project containing
  **1..N Pages** (via PageManager). Materialised as a *Project Note* + one
  *Data File*. A single-page site is simply a 1-page project.
- **Project Note** — the user-facing markdown note that **is** the canonical,
  openable object for a Project: frontmatter (`tags: [specorator/project]`, `id`,
  `title`, `data-file`, `home`, `status`) + a body of user docs and an
  auto-generated *Page Index* of *Snapshots*.
- **Page** — one page **inside** a Project, managed by GrapesJS PageManager. Has
  a name and a derived route/slug. Not a separate note; surfaced in the Project
  Note's *Page Index*.
- **Project Id** — a stable generated id stored in the Project Note frontmatter;
  binds the note to its *Data File* (`<DataFolder>/<id>.gjs.json`) and is the
  handle used by MCP and reload-from-disk. Survives note rename/move.
- **Project Data** — GrapesJS's native, lossless project JSON
  (`editor.getProjectData()`): all pages, the component tree, styles, assets.
  Stored **verbatim** as the editing source of truth.
- **Data File** — the file holding *Project Data*, stored in the hidden
  `Specorator/.data/` dot-folder (adapter API; not Obsidian-Sync'd by default —
  README/settings warn Sync users).
- **Snapshot / Page Index** — an auto-generated, read-only HTML/CSS rendering of
  each *Page*, written into the *Project Note* body (one section per page) for
  at-a-glance reading and git diffs. Never parsed back.
- **Component** — a reusable building block draggable in the builder.
- **Component Note** — one markdown note defining one *Component*: a
  `specorator/component` tag marker + flat, lightly-namespaced properties
  (label, category, icon, block-id) + ` ```html ` / ` ```css ` fences +
  documentation prose. Lives in the *Library*.
- **Block** — the GrapesJS-registered form of a *Component* (`Blocks.add`) shown
  in the editor's Blocks panel. Content is the note's HTML string; the note's
  CSS rides along as an embedded `<style>` imported into Project CSS on drop.
- **Library** — the configurable vault folder of *Component Notes* (default
  `Specorator/Components`), scanned and live-refreshed into *Blocks*.
- **Builder View** — the Obsidian `ItemView` (workspace leaf) hosting an
  interactive GrapesJS editor bound to one *Project*; one editor per leaf.
- **Preview Server** — the opt-in local `127.0.0.1` static webserver that serves
  the per-project static *Build* from the plugin data folder; opened via the
  *Viewer*.
- **Viewer** — how a preview URL is shown: the Obsidian Web Viewer core plugin
  when enabled, otherwise the system browser.
- **Build / Export** — rendering a *Project*'s *Project Data* (all its pages) to
  a static multi-page site via the headless *RendererPort*, output to
  `<plugin-data>/dist/<id>/`.
- **MCP Server** — the opt-in local Streamable-HTTP server letting AI agents
  drive the builder through *Tools*/*Resources*/*Prompts*.
- **Claude Assets** — the opt-in skills, subagents, and slash commands the plugin
  installs (single toggle) into the vault's `.claude/` directory.
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
