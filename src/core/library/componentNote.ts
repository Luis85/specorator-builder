import type { ComponentDef } from "../domain/types";
import { extractFence, stripFences } from "../parsing/fences";
import { slugify } from "../ids";

export interface RawNote {
  /** Already-parsed frontmatter (by the adapter), or {} if none. */
  frontmatter: Record<string, unknown>;
  /** Note body (after frontmatter). */
  body: string;
  /** Note basename (filename without extension). */
  basename: string;
  /** Vault path. */
  path: string;
}

const COMPONENT_TAG = "specorator/component";

/** Does this note's frontmatter carry the component tag marker? (ADR-0012) */
export function isComponentNote(frontmatter: Record<string, unknown>): boolean {
  const tags = frontmatter["tags"];
  if (Array.isArray(tags)) {
    return tags.some((t) => String(t) === COMPONENT_TAG);
  }
  if (typeof tags === "string") {
    return tags.split(/[,\s]+/).some((t) => t === COMPONENT_TAG);
  }
  return false;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Build a ComponentDef from a raw note. Pure. */
export function parseComponentDef(note: RawNote): ComponentDef {
  const fm = note.frontmatter;
  const blockId = str(fm["block-id"], slugify(note.basename));
  return {
    blockId,
    label: str(fm["label"], note.basename),
    category: str(fm["category"], "Components"),
    icon: str(fm["icon"], ""),
    html: extractFence(note.body, "html") ?? "",
    css: extractFence(note.body, "css") ?? "",
    doc: stripFences(note.body),
    sourcePath: note.path,
  };
}

/** Serialize a ComponentDef back into a well-formed component note. */
export function serializeComponentNote(def: ComponentDef): string {
  const fm = [
    "---",
    "tags: [specorator/component]",
    `label: ${def.label}`,
    `category: ${def.category}`,
    `block-id: ${def.blockId}`,
    ...(def.icon ? [`icon: ${def.icon}`] : []),
    "---",
  ].join("\n");
  const doc = def.doc ? `${def.doc}\n\n` : "";
  const html = "```html\n" + def.html.trim() + "\n```\n";
  const css = def.css.trim() ? "\n```css\n" + def.css.trim() + "\n```\n" : "";
  return `${fm}\n\n${doc}${html}${css}`;
}
