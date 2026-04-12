import { Plugin, TFile } from "obsidian";
import { cleanMarkdownToPlainText } from "../../domain/text";
import { NoteSource, NoteTextProfile, PerformanceMonitor } from "../../types";

export class ObsidianNoteSource implements NoteSource {
	constructor(
		private readonly plugin: Plugin,
		private readonly performanceMonitor?: PerformanceMonitor,
	) {
	}

	async getTextById(noteId: string): Promise<string> {
		const profile = await this.getTextProfileById(noteId);
		return profile.cleanText;
	}

	async getTextProfileById(noteId: string): Promise<NoteTextProfile> {
		return await this.measure(
			"infra.noteSource.getTextById",
			async () => {
				const f = this.plugin.app.vault.getAbstractFileByPath(noteId);
				if (!(f instanceof TFile)) throw new Error("Unable to read file");
				const markdown = await this.plugin.app.vault.read(f);
				const rawText = `${f.basename}\n\n${markdown}`;
				const cleanText = await cleanMarkdownToPlainText(rawText, this.plugin);
				return {
					rawText,
					cleanText,
					rawChars: rawText.length,
					cleanChars: cleanText.length,
					paragraphCount: this.countParagraphs(cleanText),
				};
			},
		);
	}

	listIds() {
		return this.plugin.app.vault.getMarkdownFiles().map(f => f.path);
	}

	async isEmpty(noteId: string) {
		const text = await this.getTextById(noteId);
		return text.length === 0;
	}

	private async measure<T>(name: string, run: () => Promise<T>): Promise<T> {
		if (this.performanceMonitor) {
			return await this.performanceMonitor.measure(name, run);
		}
		return await run();
	}

	private countParagraphs(text: string): number {
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\n\s*\n/).filter(Boolean).length;
	}
}
