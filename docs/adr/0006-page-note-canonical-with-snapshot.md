# 0006 — Page note is canonical; body carries an auto-generated snapshot

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

To keep the vault the source of truth and make the visual work feel
markdown-native, users should open, search, and link a *Page* as an ordinary
note. But the note must be meaningful when read or diffed, without becoming a
second (lossy) source of truth alongside the *Data File*.

## Decision

The *Page Note* is the user-facing **canonical, openable object**. Its body
contains user documentation plus an **auto-generated, clearly-marked read-only
*Snapshot*** region (under `## Snapshot (auto-generated — do not edit)`) derived
from `getHtml`/`getCss`. The *Data File* (Project Data) remains the editing
source of truth; the Snapshot is never parsed back.

## Consequences

- Reading view and git diffs show a meaningful render of the page.
- Refreshing the Snapshot is a side effect of saving; it must never block or
  corrupt the save, and must not be treated as input.
- Users get a clear mental model: edit visually, read as markdown.
