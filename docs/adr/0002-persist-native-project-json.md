# 0002 — Persist GrapesJS native project JSON as the source of truth

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

GrapesJS has two serialisations: **Project Data** (`getProjectData()` /
`loadProjectData()`), the lossless native JSON; and **HTML/CSS export**
(`getHtml()`/`getCss()`), which the docs explicitly warn is lossy and one-way —
re-importing strips traits, custom types, layer names, symbol links, and
device-grouped styles. The product goal is a lossless round-trip ("best format
the framework can work with") while keeping a human-readable side.

## Decision

Persist verbatim **Project Data** JSON as the editable source of truth in the
*Data File*. HTML/CSS export is used **only** for the read-only *Snapshot*, the
preview/build output, and optional Astro hand-off — never for persistence or
round-trip.

## Consequences

- Editing is lossless; the *Data File* is opaque to the core domain (a JSON
  blob) and interpreted only by the editor adapter.
- The human-readable representation is derived (Snapshot), not authoritative.
- A custom GrapesJS Storage backend reads/writes the *Data File* (see 0008).
