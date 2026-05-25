import type { BlockConfig, ComponentDef } from "../domain/types";

/**
 * Map a ComponentDef to a GrapesJS block config (ADR-0012). The CSS rides along
 * as an embedded <style> tag so GrapesJS imports it into Project CSS on drop
 * (present only where the component is used).
 */
export function toBlockConfig(def: ComponentDef): BlockConfig {
  const style = def.css.trim() ? `\n<style>${def.css.trim()}</style>` : "";
  return {
    id: def.blockId,
    label: def.label,
    category: def.category,
    media: def.icon ? mediaFor(def.icon) : undefined,
    content: `${def.html.trim()}${style}`,
  };
}

/** Wrap an emoji/text icon for the block media; pass SVG/HTML through. */
function mediaFor(icon: string): string {
  const trimmed = icon.trim();
  if (trimmed.startsWith("<")) return trimmed;
  return `<div class="sp-block-icon">${trimmed}</div>`;
}

/** De-duplicate blocks by id, keeping the first and reporting collisions. */
export function dedupeBlocks(defs: ComponentDef[]): {
  blocks: BlockConfig[];
  duplicates: string[];
} {
  const seen = new Set<string>();
  const blocks: BlockConfig[] = [];
  const duplicates: string[] = [];
  for (const def of defs) {
    if (seen.has(def.blockId)) {
      duplicates.push(def.blockId);
      continue;
    }
    seen.add(def.blockId);
    blocks.push(toBlockConfig(def));
  }
  return { blocks, duplicates };
}
