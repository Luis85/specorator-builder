import { describe, it, expect } from "vitest";
import {
  isComponentNote,
  parseComponentDef,
  serializeComponentNote,
} from "./componentNote";

describe("isComponentNote", () => {
  it("detects the tag in an array", () => {
    expect(isComponentNote({ tags: ["a", "specorator/component"] })).toBe(true);
  });
  it("detects the tag in a string", () => {
    expect(isComponentNote({ tags: "specorator/component" })).toBe(true);
  });
  it("is false without the tag", () => {
    expect(isComponentNote({ tags: ["other"] })).toBe(false);
    expect(isComponentNote({})).toBe(false);
  });
});

describe("parseComponentDef", () => {
  it("uses frontmatter with sensible defaults", () => {
    const def = parseComponentDef({
      frontmatter: { label: "Hero", category: "Sections", icon: "🦸" },
      body: "Docs\n\n```html\n<h1>Hi</h1>\n```\n",
      basename: "Hero Block",
      path: "Components/Hero Block.md",
    });
    expect(def.label).toBe("Hero");
    expect(def.category).toBe("Sections");
    expect(def.icon).toBe("🦸");
    expect(def.blockId).toBe("hero-block"); // slug of basename
    expect(def.html).toBe("<h1>Hi</h1>");
    expect(def.doc).toBe("Docs");
  });

  it("honors an explicit block-id", () => {
    const def = parseComponentDef({
      frontmatter: { "block-id": "custom-id" },
      body: "```html\n<p>x</p>\n```",
      basename: "Whatever",
      path: "p.md",
    });
    expect(def.blockId).toBe("custom-id");
  });
});

describe("serializeComponentNote round-trips", () => {
  it("re-parses to an equivalent def", () => {
    const original = {
      blockId: "card",
      label: "Card",
      category: "UI",
      icon: "▢",
      html: '<div class="sp-card">c</div>',
      css: ".sp-card { padding: 1rem; }",
      doc: "A card.",
      sourcePath: "x.md",
    };
    const note = serializeComponentNote(original);
    // Strip frontmatter for re-parse (adapter parses YAML; here we pass it in).
    const body = note.split("---").slice(2).join("---").trimStart();
    const def = parseComponentDef({
      frontmatter: {
        label: "Card",
        category: "UI",
        icon: "▢",
        "block-id": "card",
      },
      body,
      basename: "Card",
      path: "x.md",
    });
    expect(def.html).toBe(original.html);
    expect(def.css).toBe(original.css);
    expect(def.doc).toBe(original.doc);
  });
});
