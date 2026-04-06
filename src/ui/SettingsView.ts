import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import RelatedNotes from "../main";
import { parseIgnoredPaths } from "../domain/ignoreRules";
import { AppServices } from "../app/buildAppServices";

export class SettingView extends PluginSettingTab {
  plugin: RelatedNotes;
  services: AppServices;

  constructor(app: App, plugin: RelatedNotes, services: AppServices) {
    super(app, plugin);
    this.plugin = plugin;
    this.services = services;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    containerEl.createEl("h2", {text: "Similarity"});

    let draftIgnored = [...this.services.settings.ignoredPaths];

    new Setting(containerEl)
      .setName("Ignored paths/folders")
      .setDesc("One entry per line. Folder paths ignore everything under that folder.")
      .addTextArea((text) => {
        text
          .setPlaceholder("Templates\nArchive/2023\nScratch.md")
          .setValue(draftIgnored.join("\n"))
          .onChange((value) => {
            draftIgnored = parseIgnoredPaths(value);
          });
        text.inputEl.rows = 8;
        text.inputEl.cols = 40;
      });

    new Setting(containerEl)
      .setName("Save settings")
      .setDesc("Saving updates your similarity results to match these settings.")
      .addButton((button) => {
        button.setButtonText("Save").setCta().onClick(async () => {
          button.setDisabled(true);
          try {
            const syncResult = await this.services.saveIgnoredPathsAndSync(draftIgnored);
            if (syncResult) {
              new Notice(`Settings saved. Re-synced index (indexed: ${syncResult.indexed}, removed: ${syncResult.deleted}).`);
            } else {
              new Notice(`Settings saved.`)
            }
          } finally {
            button.setDisabled(false);
          }
        });
      });
  }
}
