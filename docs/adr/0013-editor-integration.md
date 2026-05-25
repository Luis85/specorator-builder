# 0013 — Editor integration: one editor per leaf, preset-webpage, light theming

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

GrapesJS is a heavy, iframe-based editor. We must decide how many live instances
we allow, what drives the editor UI/feature set, and how far to theme it into
Obsidian.

## Decision

1. **One editor per builder leaf.** Matches Obsidian's per-leaf `ItemView`
   model (two projects side by side). Cost is controlled by `destroy()` on leaf
   close, lazy-importing GrapesJS on first open, and a soft warning when many
   leaves are open. A single shared/swapping editor was rejected as awkward
   against multi-leaf.
2. **UI from `grapesjs-preset-webpage` + `grapesjs-blocks-basic`.** These provide
   responsive/device editing, a code view, import/export, and basic blocks out of
   the box (the competitive table stakes); we layer our component blocks, vault
   asset manager, storage backend, and theming on top. A fully custom panel set
   is deferred.
3. **Light Obsidian-variable theming.** Remap GrapesJS's main panel colors to
   Obsidian CSS variables so it tracks light/dark, without reproducing Obsidian's
   chrome. A deep restyle was rejected as brittle against GrapesJS upgrades.

## Consequences

- The interactive editor is owned by the `BuilderView`, not a core port; only the
  headless render is a port (`RendererPort`, ADR-0004).
- Bundled GrapesJS CSS is scoped to the view container so `.gjs-*` styles never
  leak into Obsidian's own UI.
