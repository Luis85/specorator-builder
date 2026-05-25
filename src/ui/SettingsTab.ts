import { App, PluginSettingTab, Setting } from "obsidian";
import type { SpecoratorSettings } from "../core/domain/types";

export interface SettingsHost {
  app: App;
  getSettings(): SpecoratorSettings;
  saveSettings(patch: Partial<SpecoratorSettings>): Promise<void>;
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

    new Setting(containerEl).setName("Preview port").addText((t) =>
      t.setValue(String(s.previewPort)).onChange((v) => {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0)
          void this.host.saveSettings({ previewPort: n });
      })
    );

    new Setting(containerEl)
      .setHeading()
      .setName("Opt-in capabilities (default off)");
    containerEl.createEl("p", {
      text: "Preview webserver, MCP server, and component code execution are added in later milestones; each will be a default-off consent gate.",
      cls: "setting-item-description",
    });
  }
}
