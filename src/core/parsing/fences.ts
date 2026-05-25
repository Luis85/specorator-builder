// Pure extraction of fenced code blocks from a markdown body.

/** Return the contents of the first ```<lang> fenced block, or null. */
export function extractFence(body: string, lang: string): string | null {
  const normalized = body.replace(/\r\n/g, "\n");
  const re = new RegExp("```" + lang + "[^\\n]*\\n([\\s\\S]*?)```", "i");
  const match = re.exec(normalized);
  return match ? match[1].replace(/\n$/, "") : null;
}

/** Remove all fenced code blocks, leaving the prose documentation. */
export function stripFences(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/```[^\n]*\n[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
