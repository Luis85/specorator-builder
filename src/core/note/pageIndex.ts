import type { RenderedPage } from "../ports";

export const PAGE_INDEX_HEADING = "## Pages (auto-generated — do not edit)";

/**
 * Build the read-only Page Index section for a Project Note body (ADR-0006).
 * One fenced HTML snapshot per page — meaningful in reading view and git diffs,
 * never parsed back.
 */
export function buildPageIndexSection(pages: RenderedPage[]): string {
  const blocks = pages.map((p) => {
    const html = p.html.trim();
    return `### ${p.name}\n\n\`\`\`html\n${html}\n\`\`\``;
  });
  const body = blocks.length ? blocks.join("\n\n") : "_No pages yet._";
  return `${PAGE_INDEX_HEADING}\n\n${body}\n`;
}

/**
 * Replace the Page Index section in a note body with `section`. The Page Index
 * is the trailing section by convention, so everything from the heading onward
 * is replaced; if absent, the section is appended.
 */
export function replacePageIndex(body: string, section: string): string {
  const idx = body.indexOf(PAGE_INDEX_HEADING);
  if (idx === -1) {
    const sep = body.endsWith("\n\n")
      ? ""
      : body.endsWith("\n")
        ? "\n"
        : "\n\n";
    return `${body}${sep}${section}`;
  }
  return `${body.slice(0, idx)}${section}`;
}
