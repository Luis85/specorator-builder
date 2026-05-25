// Port interfaces the core depends on (ADR-0001/0010). Adapters implement these;
// the core never imports `obsidian`, Node, or `grapesjs`.

import type {
  BlockConfig,
  ComponentDef,
  ProjectData,
  ProjectMeta,
  SpecoratorSettings,
} from "./domain/types";

/** Owns a Project as note + JSON data file kept consistent (ADR-0008/0011). */
export interface ProjectStore {
  create(title: string, folder?: string): Promise<ProjectMeta>;
  load(id: string): Promise<{ meta: ProjectMeta; data: ProjectData } | null>;
  loadData(id: string): Promise<ProjectData | null>;
  saveData(id: string, data: ProjectData): Promise<void>;
  list(): Promise<ProjectMeta[]>;
}

/** Enumerate + read component notes; notify on change (ADR-0012). */
export interface LibraryScanPort {
  scan(): Promise<ComponentDef[]>;
  onChange(handler: () => void): () => void;
}

/** Headless render seam — hides all of GrapesJS (ADR-0004). */
export interface RendererPort {
  render(data: ProjectData): Promise<{ pages: RenderedPage[] }>;
}

export interface RenderedPage {
  name: string;
  slug: string;
  html: string;
  css: string;
}

/** Open a URL inside Obsidian (Web Viewer) or the system browser (ViewerPort). */
export interface ViewerPort {
  open(url: string): Promise<void>;
}

export interface SettingsPort {
  get(): SpecoratorSettings;
  update(patch: Partial<SpecoratorSettings>): Promise<void>;
}

/** Used by the BuilderView to register library components as editor blocks. */
export type BlockSink = (blocks: BlockConfig[]) => void;
