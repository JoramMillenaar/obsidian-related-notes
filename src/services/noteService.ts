import { App, TFile } from 'obsidian';

export type RelatedNote = {
	similarity: number;
	title: string;
	path: string;
};

export type NoteEmbedding = {
	path: string;
	embeddings: Float32Array[];
};

export class NoteService {
	constructor(
		private app: App
	) { }

	activeNotePath() {
		const current = this.app.workspace.getActiveFile();
		if (current && current.path) {
			return current.path;
		} else {
			return null;
		}
	}

	getAllNotePaths(): string[] {
		return this.app.vault.getMarkdownFiles().map(file => file.path);
	}

	async getNoteContent(path: string): Promise<string> {
		const file = this.app.vault.getAbstractFileByPath(path);

		if (file instanceof TFile) {
			return await this.app.vault.read(file);
		} else {
			throw new Error(`Note not found at path: ${path}`);
		}
	}
}
