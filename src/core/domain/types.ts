// Pure domain types. No imports of `obsidian`, Node, or `grapesjs` (ADR-0001).

/** GrapesJS native project JSON — opaque to the core domain (ADR-0002). */
export type ProjectData = Record<string, unknown>;

/** Metadata read from / written to a Project Note's frontmatter (ADR-0011). */
export interface ProjectMeta {
  /** Stable id binding the note to its data file; survives rename. */
  id: string;
  title: string;
  /** Name of the page that maps to "/". */
  home?: string;
  status?: string;
  /** Vault-relative path to the `<id>.gjs.json` data file. */
  dataFile: string;
}

/** A reusable component parsed from one Component Note (ADR-0012). */
export interface ComponentDef {
  /** Stable GrapesJS block id. */
  blockId: string;
  label: string;
  category: string;
  /** lucide name, emoji, or inline SVG. */
  icon: string;
  /** The note's ```html fence, verbatim. */
  html: string;
  /** The note's ```css fence, or "" if absent. */
  css: string;
  /** Prose documentation (body with fences removed). */
  doc: string;
  /** Vault path of the source note. */
  sourcePath: string;
}

/** Framework-agnostic block config produced by the core (maps to Blocks.add). */
export interface BlockConfig {
  id: string;
  label: string;
  category: string;
  media?: string;
  content: string;
}

export interface SpecoratorSettings {
  schemaVersion: number;
  componentsFolder: string;
  projectsFolder: string;
  dataFolder: string;
  assetsFolder: string;
  /** Consent gates — all default-off (SEC-1). */
  consent: {
    previewServer: boolean;
    mcpServer: boolean;
    componentCode: boolean;
  };
  previewPort: number;
  autosaveMs: number;
}

export const DEFAULT_SETTINGS: SpecoratorSettings = {
  schemaVersion: 1,
  componentsFolder: "Specorator/Components",
  projectsFolder: "Specorator/Projects",
  dataFolder: "Specorator/.data",
  assetsFolder: "Specorator/Assets",
  consent: { previewServer: false, mcpServer: false, componentCode: false },
  previewPort: 4830,
  autosaveMs: 1500,
};
