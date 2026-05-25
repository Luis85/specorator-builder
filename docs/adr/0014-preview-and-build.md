# 0014 — Preview & build: per-project, plugin-data dist, auto-build single server

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

Since a Project is a multi-page site (ADR-0011), preview/build are per-project.
We must decide where build output lives, how Preview behaves, how assets are
handled, and the minimum Obsidian version for the in-app preview.

## Decision

1. **Output location — plugin data folder.** Builds write to
   `<plugin-data>/dist/<projectId>/`. Regenerable artifacts stay out of the vault
   (no note/search/sync clutter) while the Node `http` server still gets a real
   absolute path on desktop. In-vault and temp-dir were rejected.
2. **Preview flow — auto-build + single shared server.** `Preview` rebuilds the
   current project (cheap headless render), then a single `127.0.0.1` server
   rooted at `dist/` serves it and opens `/<projectId>/` in the Web Viewer
   (browser fallback). One port, one lifecycle; projects coexist under subpaths.
   Server closed in `onunload`; port configurable with `EADDRINUSE` fallback.
3. **Assets — vault folder + URLs, copy on build.** The Asset Manager lists
   images from a configured vault assets folder (via `getResourcePath`) and
   accepts external URLs; Build copies referenced vault images into
   `dist/assets/` with rewritten relative URLs (`app://`/absolute paths don't
   resolve in a static site). Drag-drop upload-to-vault is deferred.
4. **`minAppVersion` = 1.8.10** so the in-app Web Viewer showcase works; older
   versions fall back to the system browser.

## Consequences

- Default preview port is chosen away from common dev servers (incl. Astro's
  4321) so things coexist.
- Headless render runs in the renderer (has `window`/`document`); never a pure
  Node child process (ADR-0004).
