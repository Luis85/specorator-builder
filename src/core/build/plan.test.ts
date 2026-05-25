import { describe, it, expect } from "vitest";
import { pageRoute, planBuild } from "./plan";
import type { RenderedPage } from "../ports";

const page = (name: string, html = "<p>x</p>"): RenderedPage => ({
  name,
  slug: name,
  html,
  css: ".x{}",
});

describe("pageRoute", () => {
  it("maps the home page to index.html", () => {
    expect(pageRoute("Home", "Home")).toBe("index.html");
  });
  it("maps other pages to slug/index.html", () => {
    expect(pageRoute("About Us", "Home")).toBe("about-us/index.html");
  });
});

describe("planBuild", () => {
  it("wraps each page and routes home to index", () => {
    const plan = planBuild("Site", "home", [page("home"), page("about")]);
    const paths = plan.files.map((f) => f.path);
    expect(paths).toEqual(["index.html", "about/index.html"]);
    expect(plan.files[0].content).toContain("<title>Site — home</title>");
    expect(plan.files[0].content).toContain("<p>x</p>");
  });

  it("falls back to first page as index when no home matches", () => {
    const plan = planBuild("Site", "missing", [page("one"), page("two")]);
    expect(plan.files[0].path).toBe("index.html");
    expect(plan.files[1].path).toBe("two/index.html");
  });

  it("rewrites in-project links to relative routes", () => {
    const plan = planBuild("Site", "home", [
      page("home", '<a href="about">About</a>'),
      page("about", '<a href="/">Home</a>'),
    ]);
    expect(plan.files[0].content).toContain('href="about/index.html"');
    expect(plan.files[1].content).toContain('href="../index.html"');
  });
});
