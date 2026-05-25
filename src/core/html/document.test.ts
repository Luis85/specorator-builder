import { describe, it, expect } from "vitest";
import { buildHtmlDocument, buildIndexHtml } from "./document";

describe("buildHtmlDocument", () => {
  it("includes title, css, and html", () => {
    const out = buildHtmlDocument({
      title: "Home",
      html: "<h1>Hi</h1>",
      css: ".x{}",
    });
    expect(out).toContain("<title>Home</title>");
    expect(out).toContain(".x{}");
    expect(out).toContain("<h1>Hi</h1>");
    expect(out.startsWith("<!doctype html>")).toBe(true);
  });
  it("escapes the title", () => {
    const out = buildHtmlDocument({ title: "a<b>", html: "", css: "" });
    expect(out).toContain("<title>a&lt;b&gt;</title>");
  });
});

describe("buildIndexHtml", () => {
  it("links each entry", () => {
    const out = buildIndexHtml("Site", [{ title: "About", href: "about/" }]);
    expect(out).toContain('<a href="about/">About</a>');
  });
});
