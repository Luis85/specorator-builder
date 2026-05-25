import { describe, it, expect } from "vitest";
import { toBlockConfig, dedupeBlocks } from "./blockFactory";
import type { ComponentDef } from "../domain/types";

function def(partial: Partial<ComponentDef>): ComponentDef {
  return {
    blockId: "b",
    label: "B",
    category: "Components",
    icon: "",
    html: "<p>x</p>",
    css: "",
    doc: "",
    sourcePath: "p.md",
    ...partial,
  };
}

describe("toBlockConfig", () => {
  it("embeds css as a <style> tag in content", () => {
    const block = toBlockConfig(def({ css: ".a{color:red}" }));
    expect(block.content).toBe("<p>x</p>\n<style>.a{color:red}</style>");
  });
  it("omits style when no css", () => {
    expect(toBlockConfig(def({})).content).toBe("<p>x</p>");
  });
  it("wraps emoji icons but passes svg through", () => {
    expect(toBlockConfig(def({ icon: "🦸" })).media).toBe(
      '<div class="sp-block-icon">🦸</div>'
    );
    expect(toBlockConfig(def({ icon: "<svg/>" })).media).toBe("<svg/>");
  });
});

describe("dedupeBlocks", () => {
  it("keeps first and reports duplicate ids", () => {
    const { blocks, duplicates } = dedupeBlocks([
      def({ blockId: "x", label: "first" }),
      def({ blockId: "x", label: "second" }),
      def({ blockId: "y" }),
    ]);
    expect(blocks.map((b) => b.id)).toEqual(["x", "y"]);
    expect(blocks[0].label).toBe("first");
    expect(duplicates).toEqual(["x"]);
  });
});
