import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import RelatedNotes from "../main";
import { parseIgnoredPaths } from "../domain/ignoreRules";
import { SettingsRepository } from "../types";
import { UpdateIgnoredPathsUseCase } from "../app/updateIgnoredPaths";

export type SettingsViewDeps = {
	settingsRepo: SettingsRepository,
	updateIgnoredPaths: UpdateIgnoredPathsUseCase,
}


export class SettingView extends PluginSettingTab {
	constructor(
		app: App,
		plugin: RelatedNotes,
		private readonly deps: SettingsViewDeps,
	) {
		super(app, plugin);
	}

	async display() {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl).setName("Similarity").setHeading();

		const settings = await this.deps.settingsRepo.get();
		let draftIgnored = settings.ignoredPaths;

		new Setting(containerEl)
			.setName("Ignored paths/folders")
			.setDesc("One entry per line. Folder paths ignore everything under that folder. Append .md to a filename to ignore a specific note.")
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
						const syncResult = await this.deps.updateIgnoredPaths(draftIgnored);
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
