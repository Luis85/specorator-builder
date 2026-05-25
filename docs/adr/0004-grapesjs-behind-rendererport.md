# 0004 — GrapesJS confined to adapters behind a deep RendererPort

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

GrapesJS is DOM-bound and large; it cannot live in the pure core. Yet the build
use-cases need to turn *Project Data* into HTML/CSS. We also have two distinct
GrapesJS usages: the **interactive** editor in the *Builder View*, and a
**headless** render for builds.

## Decision

Keep all GrapesJS code in `adapters/editor`. Expose only a deep **`RendererPort`**
to the core: `render(projectData) → { html, css }`, implemented by a headless
GrapesJS instance. The interactive editor is **not** a port — it is owned by the
`BuilderView` and wired directly, because it is inherently a UI concern.
(`RendererPort` is the renamed former `EditorPort`, clarifying that it is only
the headless render seam.)

## Consequences

- The core depends on a tiny interface that hides an entire library — a *deep*
  module with high leverage.
- Build use-cases are testable against a stub renderer.
- Headless render runs in Obsidian's Electron renderer (has `window`/`document`);
  never in a pure Node child process without jsdom.
