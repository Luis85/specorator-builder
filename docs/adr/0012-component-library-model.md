# 0012 — Component library model: flat schema, HTML-string blocks, `<style>` CSS

- **Status:** Accepted
- **Date:** 2026-05-25
- **Refines:** ADR-0003.

## Context

A Component Note must register as a GrapesJS Block, stay readable in Obsidian,
and be browsable as data in Bases. Three coupled sub-decisions: how to recognise
and shape the frontmatter, how the markup becomes a block, and how CSS is handled
without global collisions.

## Decision

1. **Recognition & schema — flat top-level props + tag.** A note is a component
   if, within the configured Library folder, it carries the tag
   `specorator/component`. Metadata is **flat, lightly-namespaced, top-level**
   properties (`label`, `category`, `icon`, `block-id`), all optional with
   defaults derived from the note title/filename. Flat props are first-class in
   Obsidian's Properties editor and queryable/groupable in Bases; a nested
   `component:` map was rejected because Properties/Bases treat nested objects as
   second-class.
2. **Block content — HTML string.** The note's ` ```html ` fence is handed to
   `Blocks.add(blockId, { content: <html> })` verbatim; GrapesJS parses it on
   drop. Typed/parametric Component Definitions (traits/props) are deferred
   (FR-16).
3. **CSS — embedded `<style>` + naming convention.** The note's ` ```css ` rides
   along as a `<style>` tag in the block content, so GrapesJS imports it into
   Project CSS **on drop** (present only where used) and it stays editable in the
   Style Manager. Cross-component collisions are avoided by a documented,
   component-prefixed class convention (BEM-ish), checked by the
   `sb-lint-library` skill. Auto-scoping and inline-only were rejected (fragile /
   loses the styling workflow).

## Consequences

- Library scanning is folder-scoped (fast) + tag-gated (no accidental
  components); malformed notes are skipped with a Notice + status indicator.
- Duplicate `block-id`s warn; first scanned wins.
- "Save selection as component" writes a new note in exactly this shape.
