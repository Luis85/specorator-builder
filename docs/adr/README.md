# Architecture Decision Records

Each ADR captures one load-bearing decision so future reviews (human or agent)
don't re-litigate it. Format: **Status**, **Context**, **Decision**,
**Consequences**. Statuses: `Proposed`, `Accepted`, `Superseded by NNNN`,
`Deprecated`. Files are numbered `NNNN-kebab-title.md` and are append-only — to
change a decision, add a new ADR that supersedes the old one.

| ADR | Title | Status |
|-----|-------|--------|
| 0001 | Ports-and-adapters with a pure core | Accepted |
| 0002 | Persist GrapesJS native project JSON as the source of truth | Accepted |
| 0003 | One markdown note per component | Accepted |
| 0004 | GrapesJS confined to adapters behind a deep RendererPort | Accepted |
| 0005 | Project data files live in a hidden `Specorator/.data/` dot-folder | Accepted |
| 0006 | Project note is canonical; body carries an auto-generated page index | Accepted |
| 0007 | Independent of `specorator-astro` (inspiration, not dependency) | Accepted |
| 0008 | Merge persistence into a deep `ProjectStore` | Accepted |
| 0009 | MCP / open-editor conflicts resolve via reload-from-disk | Accepted |
| 0010 | MCP transport + auth; retain service ports | Accepted |
| 0011 | Adopt GrapesJS PageManager: one note = one project | Accepted |
| 0012 | Component library model: flat schema, HTML-string blocks, `<style>` CSS | Accepted |
| 0013 | Editor integration: one editor per leaf, preset-webpage, light theming | Accepted |
| 0014 | Preview & build: per-project, plugin-data dist, auto-build single server | Accepted |
| 0015 | Claude-asset opt-in: a single default-off toggle | Accepted |
