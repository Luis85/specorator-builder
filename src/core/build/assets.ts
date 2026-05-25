// Pure asset-URL handling for the build (ADR-0014). The adapter decides which
// URLs are vault assets and supplies the replacement map; this layer only
// detects candidate URLs and rewrites them.

const URL_ATTR_RE = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const CSS_URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

/** Collect candidate asset URLs referenced in html + css. */
export function collectAssetUrls(html: string, css: string): string[] {
  const found = new Set<string>();
  for (const re of [URL_ATTR_RE, CSS_URL_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    const source = re === CSS_URL_RE ? css : html;
    while ((m = re.exec(source))) {
      const url = m[1].trim();
      if (url && !url.startsWith("data:") && !url.startsWith("#")) {
        found.add(url);
      }
    }
  }
  return [...found];
}

/** Replace every URL in `content` that appears as a key in `map`. */
export function rewriteUrls(content: string, map: Map<string, string>): string {
  let out = content;
  for (const [from, to] of map) {
    out = out.split(from).join(to);
  }
  return out;
}

/** True for URLs we leave untouched (remote / data / anchors). */
export function isExternalUrl(url: string): boolean {
  return (
    /^[a-z]+:\/\//i.test(url) &&
    !url.startsWith("app://") &&
    !url.startsWith("capacitor://")
  );
}
