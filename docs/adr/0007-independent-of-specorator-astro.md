# 0007 — Independent of `specorator-astro` (inspiration, not dependency)

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

`specorator-astro` is a sibling plugin (Bases → Astro static site, localhost
preview via Web Viewer, markdown component notes, ports-and-adapters). It is a
strong source of UX/architecture patterns. The risk is coupling the two so that
Specorator Builder needs the sibling installed or conforms to its formats.

## Decision

Specorator Builder is **fully standalone**. It does not require, import, depend
on, or talk to the Astro plugin, and works with neither installed. We **borrow
patterns** (ports-and-adapters, consent gates, Web-Viewer-or-browser preview,
settings as source of truth, markdown component notes). Any interop is
**optional and dependency-free**: we define our own *Component Note* convention;
a *Component Note* may carry an extra ` ```astro ` fence the sibling can read,
and a later "Publish to Astro" action can emit Astro-friendly files — one-way,
file-based, never assumed.

## Consequences

- No runtime coupling, no shared process, no installed-plugin assumption.
- Default ports are chosen to avoid colliding with common dev servers (incl.
  Astro's 4321) so both coexist if present.
- If the Astro exporter is built, the sibling's frontmatter/fence schema is
  verified against its source at that time (not on the critical path).
