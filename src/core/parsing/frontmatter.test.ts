import { describe, it, expect } from "vitest";
import { splitFrontmatter } from "./frontmatter";

describe("splitFrontmatter", () => {
  it("splits frontmatter and body", () => {
    const { frontmatter, body } = splitFrontmatter(
      "---\ntitle: Hi\n---\nHello world\n"
    );
    expect(frontmatter).toBe("title: Hi");
    expect(body).toBe("Hello world\n");
  });

  it("returns null frontmatter when absent", () => {
    const { frontmatter, body } = splitFrontmatter("Just a body");
    expect(frontmatter).toBeNull();
    expect(body).toBe("Just a body");
  });

  it("normalizes CRLF", () => {
    const { frontmatter } = splitFrontmatter("---\r\na: 1\r\n---\r\nx");
    expect(frontmatter).toBe("a: 1");
  });
});
