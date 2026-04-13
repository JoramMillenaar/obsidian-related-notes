import { Plugin, TFile } from "obsidian";
import { NoteSource, RawNote } from "../../types";

export class ObsidianNoteSource implements NoteSource {
	constructor(private readonly plugin: Plugin) {
	}

	async getNoteById(noteId: string): Promise<RawNote | null> {
		const f = this.plugin.app.vault.getAbstractFileByPath(noteId);
		if (!(f instanceof TFile)) return null;

		return {
			id: noteId,
			title: f.basename,
			markdown: await this.plugin.app.vault.read(f),
		};
	}

	listIds() {
		return this.plugin.app.vault.getMarkdownFiles().map(f => f.path);
	}
}
