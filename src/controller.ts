import { EmbeddingService } from "./services/embeddingService";
import { NoteService, RelatedNote } from "./services/noteService";
import { ITextProcessingService } from "./services/textProcessorService";
import pLimit from 'p-limit';
import { StatusBarService } from "./services/statusBarService";
import RelatedNotes from "./main";
import { getNoteTitleFromPath, logError } from "./services/utils";


export class AppController {
	private statusBar: StatusBarService;

	constructor(
		private plugin: RelatedNotes,
		private noteService: NoteService,
		private embeddingService: EmbeddingService,
		private textProcessor: ITextProcessingService,
	) {
		this.statusBar = new StatusBarService(plugin);
	}

	private async getProcessedNoteContent(path: string) {
		const content = await this.noteService.getNoteContent(path);
		return this.textProcessor.processText(content);
	}

	unload() {
		this.embeddingService.unload();
	}

	async reindexCurrentActive(): Promise<void> {
		const path = this.noteService.activeNotePath();
		if (!path) return;
		const text = await this.getProcessedNoteContent(path);
		try {
			await this.embeddingService.update(path, text);
		} catch (error) {
			if (error instanceof Error && error.message.includes("EmbeddingDoesNotExist")) {
				await this.embeddingService.create(path, text);
			} else {
				logError("Error reindexing active note:", error);
				throw error;
			}
		}
	}

	async reindexAll(): Promise<void> {
		this.statusBar.update("Indexing...");
		await this.embeddingService.deleteAll();
		await this.indexAll();
		this.statusBar.update("Finished Indexing");
		setTimeout(() => this.statusBar.clear(), 3000); // Clear after 3 seconds
	}

	async indexAll(): Promise<void> {
		const paths = await this.noteService.getAllNotePaths();
		const total = paths.length;
		let processed = 0;

		const limit = pLimit(5); // Limit to 5 concurrent requests
		await Promise.all(
			paths.map((path) =>
				limit(async () => {
					const text = await this.getProcessedNoteContent(path);
					await this.embeddingService.create(path, text);
					processed++;
					this.statusBar.update(`Indexing: ${processed}/${total}`);
				})
			)
		);
	}

	async getActiveNoteRelations(): Promise<RelatedNote[]> {
		const currentPath = this.noteService.activeNotePath();
		if (!currentPath) return [];

		const text = await this.getProcessedNoteContent(currentPath);
		if (!text) return [];

		const similarNotes = await this.searchSimilarNotes(text, this.plugin.settings.maxRelatedNotes + 1); // +1 to account for the current note
		return similarNotes.filter(note => note.path !== currentPath);
	}


	async searchSimilarNotes(text: string, limit: number): Promise<RelatedNote[]> {
		const results = await this.embeddingService.fetchSimilar(text, limit);
		return results.map(result => ({
			similarity: result.similarity,
			title: getNoteTitleFromPath(result.id),
			path: result.id
		}))
	}

	async deleteNoteFromIndex(path: string) {
		await this.embeddingService.delete(path);
	}
}
