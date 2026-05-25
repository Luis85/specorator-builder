# 0001 — Ports-and-adapters with a pure core

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

The plugin integrates several impure, hard-to-test surfaces: the Obsidian API,
Node/Electron, GrapesJS (DOM-bound), a local webserver, and an MCP server. We
want the domain logic to be reasoned about and unit-tested without any of them,
and we want to mirror the sibling `specorator-astro`'s proven structure.

## Decision

Adopt ports-and-adapters. A pure **`core/`** layer (domain entities, use-cases,
port interfaces, pure parsing/HTML helpers) imports **no** `obsidian`, Node, or
`grapesjs`. An **`adapters/`** layer implements the ports and is — with
`main.ts` — the only place allowed to import those. `main.ts` is the composition
root.

## Consequences

- `core/` is Vitest-able by stubbing ports as plain objects.
- A clear rule for code review and for AI agents: business logic never reaches
  for `obsidian`/Node/`grapesjs`.
- Boundaries are enforced by convention for v1; optionally hardened later with
  `eslint-plugin-boundaries` + `dependency-cruiser`.
