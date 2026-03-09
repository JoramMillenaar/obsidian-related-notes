import { Plugin, TFile } from "obsidian";
import { cleanMarkdownToPlainText } from "../../domain/text";
import { NoteSource } from "../../types";

export class ObsidianNoteSource implements NoteSource {
	constructor(private readonly plugin: Plugin) {
	}

	async getNoteText(noteId: string): Promise<string> {
		const f = this.plugin.app.vault.getAbstractFileByPath(noteId);
		if (!(f instanceof TFile)) throw new Error("Unable to read file");
		const md = await this.plugin.app.vault.read(f);
		const title = f.basename;
		return await cleanMarkdownToPlainText(`${title}\n\n${md}`, this.plugin)
	}

	listNoteIds() {
		return this.plugin.app.vault.getMarkdownFiles().map(f => f.path);
	}

	async isNoteEmpty(noteId: string) {
		const text = await this.getNoteText(noteId);
		return text.length === 0;
	}

}
