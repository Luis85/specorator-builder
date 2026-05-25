import { describe, it, expect } from "vitest";
import { extractFence, stripFences } from "./fences";

const body = `Some docs here.

\`\`\`html
<div class="x">hi</div>
\`\`\`

\`\`\`css
.x { color: red; }
\`\`\`
`;

describe("extractFence", () => {
  it("extracts the html fence", () => {
    expect(extractFence(body, "html")).toBe('<div class="x">hi</div>');
  });
  it("extracts the css fence", () => {
    expect(extractFence(body, "css")).toBe(".x { color: red; }");
  });
  it("returns null for a missing fence", () => {
    expect(extractFence(body, "astro")).toBeNull();
  });
});

describe("stripFences", () => {
  it("removes fenced blocks leaving prose", () => {
    expect(stripFences(body)).toBe("Some docs here.");
  });
});
