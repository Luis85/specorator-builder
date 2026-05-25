// Pure HTML document builders for export/build (ADR-0014).

export interface PageDoc {
  title: string;
  html: string;
  css: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap rendered html/css into a standalone HTML document. */
export function buildHtmlDocument({ title, html, css }: PageDoc): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body>
${html}
</body>
</html>
`;
}

export interface IndexEntry {
  title: string;
  href: string;
}

/** Build a simple index page linking a project's pages. */
export function buildIndexHtml(title: string, entries: IndexEntry[]): string {
  const items = entries
    .map(
      (e) =>
        `<li><a href="${escapeHtml(e.href)}">${escapeHtml(e.title)}</a></li>`
    )
    .join("\n");
  return buildHtmlDocument({
    title,
    css: "body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem}",
    html: `<h1>${escapeHtml(title)}</h1>\n<ul>\n${items}\n</ul>`,
  });
}
