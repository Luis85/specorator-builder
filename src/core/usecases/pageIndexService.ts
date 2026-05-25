import type { ProjectStore, RendererPort } from "../ports";
import { buildPageIndexSection } from "../note/pageIndex";

/**
 * Renders a project's pages and writes the read-only Page Index into its note
 * body (ADR-0006). Orchestration only — depends on ports, not on GrapesJS.
 */
export class PageIndexService {
  constructor(
    private store: ProjectStore,
    private renderer: RendererPort
  ) {}

  async refresh(id: string): Promise<void> {
    const data = await this.store.loadData(id);
    if (!data) return;
    const { pages } = await this.renderer.render(data);
    await this.store.writePageIndex(id, buildPageIndexSection(pages));
  }
}
