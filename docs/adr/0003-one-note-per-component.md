# 0003 — One markdown note per component

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

The component library must be browsable, documented, linkable, and diff-able as
ordinary Obsidian notes ("a frontmatter+markdown component library"). Options
considered: one note per component; a single library note holding many; or
code-defined blocks with content slots.

## Decision

Each *Component* is exactly one *Component Note* in the configurable *Library*
folder: a `component:` frontmatter map (id, label, category, icon, params) plus
` ```html ` / ` ```css ` fences and documentation prose. The plugin scans the
folder and registers each as a *Block*; the note renders cleanly in reading view
and doubles as the component's documentation.

## Consequences

- Components are first-class vault citizens (search, links, graph, git).
- A clear, validated schema is required; malformed frontmatter surfaces inline.
- "Save selection as component" writes a new well-formed note, closing the loop.
- An optional ` ```astro ` fence (0007) makes a note consumable by the Astro
  sibling without imposing a dependency.
