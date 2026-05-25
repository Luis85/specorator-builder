import { describe, it, expect } from "vitest";
import { slugify, shortId } from "./ids";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hero Section!")).toBe("hero-section");
  });
  it("strips accents", () => {
    expect(slugify("Café Menu")).toBe("cafe-menu");
  });
  it("trims leading/trailing separators", () => {
    expect(slugify("  --Hi--  ")).toBe("hi");
  });
});

describe("shortId", () => {
  it("produces an 8-char alphanumeric id", () => {
    const id = shortId(() => 0.5);
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[0-9a-z]{8}$/);
  });
});
