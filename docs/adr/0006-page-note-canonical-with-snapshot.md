# 0006 — Project note is canonical; body carries an auto-generated page index

- **Status:** Accepted
- **Date:** 2026-05-25
- **Reframed by:** ADR-0011 (Page Note → Project Note; one snapshot → per-page).

## Context

To keep the vault the source of truth and make the visual work feel
markdown-native, users should open, search, and link a *Project* as an ordinary
note. But the note must be meaningful when read or diffed, without becoming a
second (lossy) source of truth alongside the *Data File*.

## Decision

The *Project Note* is the user-facing **canonical, openable object**. Its body
contains user documentation plus an **auto-generated, clearly-marked read-only
*Page Index*** — one *Snapshot* section per GrapesJS page (under
`## Pages (auto-generated — do not edit)`), derived from `getHtml`/`getCss`. The
*Data File* (Project Data, all pages) remains the editing source of truth; the
snapshots are never parsed back.

## Consequences

- Reading view and git diffs show a meaningful render of every page.
- Refreshing the Page Index is a side effect of saving; it must never block or
  corrupt the save, and must not be treated as input.
- Users get a clear mental model: edit visually, read as markdown.
