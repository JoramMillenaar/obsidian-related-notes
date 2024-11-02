import { Plugin, Notice } from 'obsidian';
import { updateNoteIndex, removeAllNoteIndices, createManyNoteIndices } from './src/services/coreServices';

interface RelatedNotesSettings {
	numberOfRelatedNotes: number;
}

export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;

	async onload() {
		this.addCommand({
			id: 'related-notes-reindex-all',
			name: 'Related Notes: Re-Index All Notes',
			callback: () => {
				removeAllNoteIndices();
				const paths: string[] = this.app.vault.getAllLoadedFiles().map(file => file.path);
				createManyNoteIndices(paths);
			}
		});
		this.addCommand({
			id: 'related-notes-reindex-note',
			name: 'Related Notes: Re-Index Current Note',
			callback: () => {
				const current = this.app.workspace.getActiveFile();
				if (current && current.path) { updateNoteIndex(current.path) } else { new Notice('No active note!') }
			}
		});
		this.addCommand({
			id: 'related-notes-show-related',
			name: 'Related Notes: Show Related Notes',
			// Open related notes list view
		});
	}

	onunload() {

	}
}
