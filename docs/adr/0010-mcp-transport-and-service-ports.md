# 0010 — MCP transport + auth; retain service ports

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

Two related decisions, both touching the opt-in agentic/service surface.

1. **MCP transport & auth.** The plugin lives inside a long-running GUI app, so
   an external agent cannot adopt it as a stdio child — stdio is not viable.
   Localhost servers are reachable by malicious browser tabs (DNS-rebinding /
   CSRF), per a real MCP TS-SDK advisory.
2. **Service ports.** The deep-module review flagged `PreviewServerPort`,
   `McpServerPort`, `SettingsPort`, and `ProcessPort` as thin/zero-adapter
   seams that the core does not call, and suggested demoting them to plain
   services and passing `Settings` as a value. The product owner chose to keep
   them.

## Decision

1. The MCP server is **in-process Streamable HTTP** bound to `127.0.0.1`.
   **Always-on, zero-friction** protection: localhost binding + `Origin`/`Host`
   validation. An **optional** regenerable bearer token (recommended,
   default-on, one-click disable) defends against other local processes but is
   not required on a trusted single-user machine. stdio-only clients connect via
   the standard `npx mcp-remote` shim; no custom bridge binary is shipped.
2. **Retain** `SettingsPort`, `PreviewServerPort`, `McpServerPort`, and
   `ProcessPort` as ports for consistency and testability — even though
   `ProcessPort` currently has no adapter (it is a reserved, anticipated seam).
   This is recorded so future architecture reviews don't re-suggest removing
   them.

## Consequences

- Friction-free local use is possible (token off) without losing the real,
  always-on defense against the browser attack.
- The settings tab shows a copy-paste client snippet; the `Authorization`
  header appears only when the token is enabled.
- The retained ports keep the adapter set uniform; if `ProcessPort` gains no
  adapter over time, a future ADR may revisit it.
