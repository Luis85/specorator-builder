# 0011 — Adopt GrapesJS PageManager: one note = one project

- **Status:** Accepted
- **Date:** 2026-05-25
- **Revises:** FR-4; reframes ADR-0006 and ADR-0008.

## Context

The initial spec implied "one note = one single-page project," stitching a
multi-page site from many notes at build time. That fought GrapesJS: PageManager
is built for multi-page projects, project-level CSS is shared across pages,
internal cross-page links resolve natively, and `grapesjs-preset-webpage` assumes
the project-with-pages model. Reconstructing all of that from many single-page
data files is work against the grain.

## Decision

The canonical unit is a **Project**: **one Project Note = one GrapesJS project =
one Data File**, where the project holds **1..N Pages** via PageManager. A
single-page site is just a 1-page project, so the simple case is unaffected. The
in-editor page switcher, native cross-page links, and project-level shared styles
all come for free. Individual pages are **not** separate notes; they are surfaced
in the Project Note body as an auto-generated *Page Index* of per-page Snapshots
(ADR-0006).

## Consequences

- `PageStore` becomes `ProjectStore` (ADR-0008), keyed by a stable Project Id.
- Build and Preview are **per-project**: one project → one static multi-page
  site (ADR-0015); no cross-project stitching.
- Page routes within a project derive from slugified page names; one page is the
  `home` (`/`); cross-page links are rewritten to relative routes at build.
- Auto-generated read-only child notes per page (browsable individually) were
  considered and deferred — the Page Index covers documentation for now.
