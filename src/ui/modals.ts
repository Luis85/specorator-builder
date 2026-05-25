import { App, Modal, Setting } from "obsidian";

/** One-time, default-off consent gate for a capability with a trust boundary. */
export class ConsentModal extends Modal {
  constructor(
    app: App,
    private opts: { title: string; body: string; confirmText: string },
    private onConfirm: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.opts.title);
    this.contentEl.createEl("p", { text: this.opts.body });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(this.opts.confirmText)
          .setCta()
          .onClick(() => {
            this.close();
            this.onConfirm();
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** Prompt for a project title. */
export class CreateProjectModal extends Modal {
  private title = "Untitled";
  constructor(
    app: App,
    private onSubmit: (title: string) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("New Specorator project");
    new Setting(this.contentEl)
      .setName("Title")
      .addText((t) => t.setValue(this.title).onChange((v) => (this.title = v)));
    new Setting(this.contentEl).addButton((b) =>
      b
        .setButtonText("Create")
        .setCta()
        .onClick(() => {
          this.close();
          this.onSubmit(this.title.trim() || "Untitled");
        })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export interface ComponentFields {
  label: string;
  category: string;
  icon: string;
}

/** Collect metadata when saving a selection as a component. */
export class SaveComponentModal extends Modal {
  private fields: ComponentFields = {
    label: "New Component",
    category: "Components",
    icon: "",
  };
  constructor(
    app: App,
    private onSubmit: (fields: ComponentFields) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Save selection as component");
    new Setting(this.contentEl)
      .setName("Label")
      .addText((t) =>
        t.setValue(this.fields.label).onChange((v) => (this.fields.label = v))
      );
    new Setting(this.contentEl)
      .setName("Category")
      .addText((t) =>
        t
          .setValue(this.fields.category)
          .onChange((v) => (this.fields.category = v))
      );
    new Setting(this.contentEl)
      .setName("Icon")
      .setDesc("Emoji, lucide name, or inline SVG (optional)")
      .addText((t) => t.onChange((v) => (this.fields.icon = v)));
    new Setting(this.contentEl).addButton((b) =>
      b
        .setButtonText("Save component")
        .setCta()
        .onClick(() => {
          this.close();
          this.onSubmit({
            label: this.fields.label.trim() || "New Component",
            category: this.fields.category.trim() || "Components",
            icon: this.fields.icon.trim(),
          });
        })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
