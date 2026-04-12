import { Plugin, TFile } from "obsidian";
import { cleanMarkdownToPlainText } from "../../domain/text";
import { NoteSource, PerformanceMonitor } from "../../types";

export class ObsidianNoteSource implements NoteSource {
	constructor(
		private readonly plugin: Plugin,
		private readonly performanceMonitor?: PerformanceMonitor,
	) {
	}

	async getTextById(noteId: string): Promise<string> {
		return await this.performanceMonitor?.measure(
			"infra.noteSource.getTextById",
			async () => {
				const f = this.plugin.app.vault.getAbstractFileByPath(noteId);
				if (!(f instanceof TFile)) throw new Error("Unable to read file");
				const md = await this.plugin.app.vault.read(f);
				const title = f.basename;
				return await cleanMarkdownToPlainText(`${title}\n\n${md}`, this.plugin);
			},
		) ?? await (async () => {
			const f = this.plugin.app.vault.getAbstractFileByPath(noteId);
			if (!(f instanceof TFile)) throw new Error("Unable to read file");
			const md = await this.plugin.app.vault.read(f);
			const title = f.basename;
			return await cleanMarkdownToPlainText(`${title}\n\n${md}`, this.plugin);
		})();
	}

	listIds() {
		return this.plugin.app.vault.getMarkdownFiles().map(f => f.path);
	}

	async isEmpty(noteId: string) {
		const text = await this.getTextById(noteId);
		return text.length === 0;
	}

}
