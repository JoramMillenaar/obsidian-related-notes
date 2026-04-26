import { Plugin, TFile } from "obsidian";
import { NoteIndexCandidate, RawNote } from "../../types";
import { NoteSource } from "../../ports";

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

	listIndexCandidates(): NoteIndexCandidate[] {
		const recentFiles = this.plugin.app.workspace.getLastOpenFiles();
		const recentOpenRanks = new Map(recentFiles.map((path, index) => [path, index]));

		return this.plugin.app.vault.getMarkdownFiles().map((file) => ({
			id: file.path,
			modifiedAt: file.stat.mtime,
			recentOpenRank: recentOpenRanks.get(file.path),
		}));
	}
}
