import { App } from "obsidian";
import type { ViewerPort } from "../../core/ports";

/** Opens a URL in the Web Viewer core plugin, else the system browser (FR-18). */
export class ObsidianViewer implements ViewerPort {
  constructor(private app: App) {}

  async open(url: string): Promise<void> {
    if (this.webViewerEnabled()) {
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({
        type: "webviewer",
        active: true,
        state: { url, navigate: true },
      });
      this.app.workspace.revealLeaf(leaf);
      return;
    }
    this.openExternal(url);
  }

  private webViewerEnabled(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = (this.app as any).internalPlugins;
    const plugin = internal?.getPluginById?.("webviewer");
    return !!plugin?.enabled;
  }

  private openExternal(url: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electron = (window as any).require?.("electron");
    if (electron?.shell?.openExternal) {
      void electron.shell.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  }
}
