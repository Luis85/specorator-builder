# 0008 — Merge persistence into a deep `ProjectStore`

- **Status:** Accepted
- **Date:** 2026-05-25
- **Reframed by:** ADR-0011 (PageStore → ProjectStore; owns a project, not a page).

> Originally proposed as `PageStore`; renamed `ProjectStore` once the canonical
> unit became a Project (ADR-0011). "Page" below means the Project unit.

## Context

An early design split page persistence across two ports: `VaultPagePort`
(read/write the Project Data JSON) and `NoteIndexPort` (create/update the Page
Note). But a *Page* is the invariant *note + Data File kept consistent*: every
create/open/save touches both, and they must not drift. Applying the deletion
test, each port alone is shallow and the page-consistency logic reappears in
every caller — lost locality across two seams.

## Decision

Replace the two ports with a single **deep `PageStore`** module owning the whole
invariant: `create(page)`, `load(id) → { note, data }`, `saveData(id, data)`
(atomic temp-write + rename for the JSON, then refresh the note Snapshot via the
Vault API), and `list()`.

## Consequences

- The page-consistency invariant lives in one place (locality); callers get a
  small interface over meaningful behaviour (depth).
- The GrapesJS storage backend delegates `load`/`store` to `PageStore`.
- `PageStore` is the natural emit-point for the reload-from-disk signal (0009).
- This was the only architecture simplification accepted in the deep-module
  review; the service ports were retained (0010).
