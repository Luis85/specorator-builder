import { isExternalUrl } from "./assets";

/**
 * Rewrite in-project page links to depth-correct relative routes (FR-22).
 *
 * Convention (ADR-0011): a page is addressable in the editor by its **slug**, so
 * authors link with `href="about"`, `"/about"`, or `"about.html"`; the home page
 * is `"/"`, `"index"`, or `""`. External URLs and in-page `#anchors` are left
 * untouched.
 *
 * @param routes  slug -> output route (e.g. "about" -> "about/index.html")
 */
export function rewritePageLinks(
  html: string,
  fromRoute: string,
  routes: Map<string, string>,
  homeSlug: string
): string {
  const depth = fromRoute.split("/").length - 1;
  const prefix = "../".repeat(depth);
  return html.replace(/href\s*=\s*"([^"]*)"/gi, (whole, href: string) => {
    const trimmed = href.trim();
    if (
      isExternalUrl(trimmed) ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("#")
    ) {
      return whole;
    }
    const key = normalizeHrefKey(trimmed);
    const slug = key === "" || key === "index" ? homeSlug : key;
    const route = routes.get(slug);
    return route ? `href="${prefix}${route}"` : whole;
  });
}

function normalizeHrefKey(href: string): string {
  return href
    .replace(/^\/+/, "")
    .replace(/\/index\.html$/i, "")
    .replace(/\.html$/i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}
