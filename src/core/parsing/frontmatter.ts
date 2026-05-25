// Pure string handling for note frontmatter. YAML parsing itself is done by the
// adapter (Obsidian's parseYaml); this only splits the regions.

export interface SplitNote {
  /** Raw YAML between the leading --- fences, or null if no frontmatter. */
  frontmatter: string | null;
  /** The note body after the frontmatter block. */
  body: string;
}

/** Split a markdown note into its leading YAML frontmatter and body. */
export function splitFrontmatter(content: string): SplitNote {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  if (!match) {
    return { frontmatter: null, body: normalized };
  }
  return {
    frontmatter: match[1],
    body: normalized.slice(match[0].length),
  };
}
