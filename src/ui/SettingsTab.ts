import { App, PluginSettingTab, Setting } from "obsidian";
import type { SpecoratorSettings } from "../core/domain/types";

export interface SettingsHost {
  app: App;
  getSettings(): SpecoratorSettings;
  saveSettings(patch: Partial<SpecoratorSettings>): Promise<void>;
  setClaudeAssets(enabled: boolean): Promise<void>;
}

export class SpecoratorSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private host: SettingsHost,
    plugin: any
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.host.getSettings();

    const folder = (
      name: string,
      desc: string,
      key: keyof Pick<
        SpecoratorSettings,
        "componentsFolder" | "projectsFolder" | "dataFolder" | "assetsFolder"
      >
    ) => {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addText((t) =>
          t.setValue(s[key]).onChange((v) => {
            void this.host.saveSettings({ [key]: v });
          })
        );
    };

    folder(
      "Components folder",
      "Where component notes live.",
      "componentsFolder"
    );
    folder(
      "Projects folder",
      "Default folder for new project notes.",
      "projectsFolder"
    );
    folder(
      "Data folder",
      "Hidden dot-folder for project data files. Not covered by Obsidian Sync — sync it via git, or use a visible folder.",
      "dataFolder"
    );
    folder("Assets folder", "Vault folder scanned for images.", "assetsFolder");

    const port = (name: string, key: "previewPort" | "mcpPort") => {
      new Setting(containerEl).setName(name).addText((t) =>
        t.setValue(String(s[key])).onChange((v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n > 0)
            void this.host.saveSettings({ [key]: n });
        })
      );
    };
    port("Preview server port", "previewPort");
    port("MCP server port", "mcpPort");

    new Setting(containerEl)
      .setHeading()
      .setName("Opt-in capabilities (default off)");
    containerEl.createEl("p", {
      text: "The preview and MCP servers are started on demand via commands and ask for one-time consent. They bind to 127.0.0.1 only.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Install Claude assets")
      .setDesc(
        "Install the bundled skills, subagents, and slash commands into .claude/ and register the MCP server in .mcp.json (ADR-0015)."
      )
      .addToggle((t) =>
        t
          .setValue(s.claudeAssetsInstalled)
          .onChange((v) => void this.host.setClaudeAssets(v))
      );
  }
}
