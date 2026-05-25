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
| 0005 | Page data files live in a hidden `Specorator/.data/` subfolder | Accepted |
| 0006 | Page note is canonical; body carries an auto-generated snapshot | Accepted |
| 0007 | Independent of `specorator-astro` (inspiration, not dependency) | Accepted |
| 0008 | Merge page persistence into a deep `PageStore` | Accepted |
| 0009 | MCP / open-editor conflicts resolve via reload-from-disk | Accepted |
| 0010 | MCP transport + auth; retain service ports | Accepted |
