import { describe, it, expect } from "vitest";
import { rewritePageLinks } from "./links";

const routes = new Map([
  ["home", "index.html"],
  ["about", "about/index.html"],
  ["contact", "contact/index.html"],
]);

describe("rewritePageLinks", () => {
  it("rewrites slug links relative to a top-level page", () => {
    const html = '<a href="about">A</a> <a href="/contact">C</a>';
    const out = rewritePageLinks(html, "index.html", routes, "home");
    expect(out).toContain('href="about/index.html"');
    expect(out).toContain('href="contact/index.html"');
  });

  it("adds ../ prefixes from a nested page", () => {
    const html = '<a href="contact">C</a> <a href="/">Home</a>';
    const out = rewritePageLinks(html, "about/index.html", routes, "home");
    expect(out).toContain('href="../contact/index.html"');
    expect(out).toContain('href="../index.html"');
  });

  it("treats index and empty as home", () => {
    const out = rewritePageLinks(
      '<a href="index">H</a>',
      "about/index.html",
      routes,
      "home"
    );
    expect(out).toContain('href="../index.html"');
  });

  it("strips a .html suffix when matching", () => {
    const out = rewritePageLinks(
      '<a href="about.html">A</a>',
      "index.html",
      routes,
      "home"
    );
    expect(out).toContain('href="about/index.html"');
  });

  it("leaves external and unknown links untouched", () => {
    const html =
      '<a href="https://x.com">x</a> <a href="mailto:a@b.c">m</a> <a href="nope">n</a>';
    const out = rewritePageLinks(html, "index.html", routes, "home");
    expect(out).toBe(html);
  });
});
