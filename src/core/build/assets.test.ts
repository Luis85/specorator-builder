import { describe, it, expect } from "vitest";
import { collectAssetUrls, rewriteUrls, isExternalUrl } from "./assets";

describe("collectAssetUrls", () => {
  it("finds src/href and css url() references", () => {
    const html = '<img src="app://abc/logo.png"><a href="page.html">x</a>';
    const css = '.b{background:url("app://abc/bg.jpg")}';
    const urls = collectAssetUrls(html, css);
    expect(urls).toContain("app://abc/logo.png");
    expect(urls).toContain("app://abc/bg.jpg");
    expect(urls).toContain("page.html");
  });
  it("ignores data: and anchor urls", () => {
    const urls = collectAssetUrls('<img src="data:image/png;base64,xx">', "");
    expect(urls).toHaveLength(0);
  });
});

describe("rewriteUrls", () => {
  it("replaces mapped urls in content", () => {
    const map = new Map([["app://abc/logo.png", "assets/logo.png"]]);
    expect(rewriteUrls('<img src="app://abc/logo.png">', map)).toBe(
      '<img src="assets/logo.png">'
    );
  });
});

describe("isExternalUrl", () => {
  it("treats https as external but app:// as local", () => {
    expect(isExternalUrl("https://x.com/a.png")).toBe(true);
    expect(isExternalUrl("app://abc/a.png")).toBe(false);
  });
});
