# 0015 — Claude-asset opt-in: a single default-off toggle

- **Status:** Accepted
- **Date:** 2026-05-25
- **Resolves:** D-5.

## Context

The plugin ships Claude skills, subagents, and slash commands (FR-30..34). The
opt-in could be all-or-nothing, per-category, or per-asset.

## Decision

A **single, default-OFF** "Install Claude assets" toggle installs the whole set
(skills + the `specorator-builder`/`component-auditor` subagents + slash
commands) into the vault's `.claude/` and writes the project `.mcp.json` (HTTP
transport). The assets are interdependent and target the same MCP tool surface,
so one set is the cleanest mental model and least code. Per-category granularity
can be added later if demanded.

## Consequences

- Idempotent install/refresh/uninstall against `.claude/`; pre-existing
  same-named user assets are warned about, not clobbered.
- Assets degrade gracefully (clear "enable the MCP server" message) when the MCP
  server is off.
