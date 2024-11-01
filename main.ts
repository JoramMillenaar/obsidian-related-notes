import { Plugin } from 'obsidian';


interface RelatedNotesSettings {
	mySetting: string;
}

export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;

	async onload() {
	}

	onunload() {

	}
}
