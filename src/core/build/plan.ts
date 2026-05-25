import type { RenderedPage } from "../ports";
import { buildHtmlDocument } from "../html/document";
import { slugify } from "../ids";

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
  const files: BuildFile[] = pages.map((p) => ({
    path: pageRoute(p.name, home),
    content: buildHtmlDocument({
      title: `${projectTitle} — ${p.name}`,
      html: p.html,
      css: p.css,
    }),
  }));

  if (files.length && !files.some((f) => f.path === "index.html")) {
    files[0] = { ...files[0], path: "index.html" };
  }
  return { files };
}
