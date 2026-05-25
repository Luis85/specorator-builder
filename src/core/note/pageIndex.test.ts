import { describe, it, expect } from "vitest";
import {
  buildPageIndexSection,
  replacePageIndex,
  PAGE_INDEX_HEADING,
} from "./pageIndex";
import type { RenderedPage } from "../ports";

const page = (name: string, html: string): RenderedPage => ({
  name,
  slug: name,
  html,
  css: "",
});

describe("buildPageIndexSection", () => {
  it("renders one fenced snapshot per page", () => {
    const out = buildPageIndexSection([page("Home", "<h1>Hi</h1>")]);
    expect(out).toContain(PAGE_INDEX_HEADING);
    expect(out).toContain("### Home");
    expect(out).toContain("```html\n<h1>Hi</h1>\n```");
  });
  it("handles no pages", () => {
    expect(buildPageIndexSection([])).toContain("_No pages yet._");
  });
});

describe("replacePageIndex", () => {
  it("appends when absent", () => {
    const out = replacePageIndex(
      "# Title\n\nDocs",
      "## Pages (auto-generated — do not edit)\n\nX\n"
    );
    expect(out).toContain("# Title");
    expect(out).toContain("X");
  });
  it("replaces an existing trailing section", () => {
    const body = `# Title\n\nDocs\n\n${PAGE_INDEX_HEADING}\n\nOLD\n`;
    const out = replacePageIndex(body, `${PAGE_INDEX_HEADING}\n\nNEW\n`);
    expect(out).toContain("NEW");
    expect(out).not.toContain("OLD");
    expect(out).toContain("Docs");
  });
});
