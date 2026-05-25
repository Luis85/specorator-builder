# 0009 — MCP / open-editor conflicts resolve via reload-from-disk

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

With the opt-in MCP server enabled, an agent can write a *Page* (or *Component*)
that is also open in a *Builder View*. We need a predictable model for the race
between the agent's on-disk write and the open editor's autosave. Options:
last-write-wins with a reload prompt; lock the page while its leaf is open; or
live-sync external changes into the editor.

## Decision

**Disk is the source of truth, with a reload-from-disk prompt.** When an MCP
write changes a page open in a leaf, `PageStore` emits a change the view detects
and the user is prompted to reload; the on-disk write wins and the editor never
silently clobbers the agent's change. `set_page_project_data` always
schema-validates and backs up before writing.

## Consequences

- Simple, predictable, and avoids silent data loss in either direction.
- The *Builder View* must watch its bound *Data File* and offer a reload action.
- Live-sync (richer UX) is explicitly out of scope for now and can supersede
  this ADR later if warranted.
