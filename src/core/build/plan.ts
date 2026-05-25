import type { RenderedPage } from "../ports";
import { buildHtmlDocument } from "../html/document";
import { slugify } from "../ids";
import { rewritePageLinks } from "./links";

export interface BuildFile {
  /** Path relative to the project's dist root. */
  path: string;
  content: string;
}

export interface BuildPlan {
  files: BuildFile[];
}

/** Output path for a page relative to the project dist root (ADR-0014). */
export function pageRoute(name: string, home: string): string {
  const slug = slugify(name) || "page";
  if (slug === (slugify(home) || "page")) return "index.html";
  return `${slug}/index.html`;
}

/**
 * Plan the static files for a project build. The `home` page maps to
 * index.html; if no page matches `home`, the first page becomes index.html.
 */
export function planBuild(
  projectTitle: string,
  home: string,
  pages: RenderedPage[]
): BuildPlan {
  const entries = pages.map((p) => ({
    page: p,
    slug: slugify(p.name) || "page",
    route: pageRoute(p.name, home),
  }));

  // Guarantee an index.html even if no page matches `home`.
  if (entries.length && !entries.some((e) => e.route === "index.html")) {
    entries[0].route = "index.html";
  }

  const routes = new Map(entries.map((e) => [e.slug, e.route]));
  const homeSlug = slugify(home) || "page";

  const files: BuildFile[] = entries.map((e) => ({
    path: e.route,
    content: buildHtmlDocument({
      title: `${projectTitle} — ${e.page.name}`,
      html: rewritePageLinks(e.page.html, e.route, routes, homeSlug),
      css: e.page.css,
    }),
  }));

  return { files };
}
