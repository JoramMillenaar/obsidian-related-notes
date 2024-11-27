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

		new Setting(containerEl).setName('Advanced').setHeading();

		new Setting(containerEl)
			.setName("Plugin Server Port")
			.setDesc("The local port to run the plugin's on-device communication through.")
			.addText((text) => {
				const restartNotice = containerEl.createEl('small', {
					text: 'Restart Obsidian or reload the plugin for changes to take effect.',
					cls: 'plugin-restart-notice',
				});
				restartNotice.style.display = 'none';

				text
					.setPlaceholder("e.g., 3000")
					.setValue(this.plugin.settings.pluginServerPort.toString())
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num)) {
							if (num !== this.plugin.settings.pluginServerPort) {
								restartNotice.style.display = 'block';
							} else {
								restartNotice.style.display = 'none';
							}
							this.plugin.settings.pluginServerPort = num;
							await this.plugin.saveSettings();
						}
					});
			});
	}
}
