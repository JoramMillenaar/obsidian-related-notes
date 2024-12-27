import RelatedNotesPlugin from './main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export class RelatedNotesSettingTab extends PluginSettingTab {
	plugin: RelatedNotesPlugin;

	constructor(app: App, plugin: RelatedNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		new Setting(containerEl)
			.setName("Max Related Notes")
			.setDesc("Set the maximum number of related notes to display.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., 5")
					.setValue(this.plugin.settings.maxRelatedNotes.toString())
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num)) {
							this.plugin.settings.maxRelatedNotes = num;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
