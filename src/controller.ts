import { EmbeddingService } from "./services/embeddingService";
import { NoteService, RelatedNote } from "./services/noteService";
import { ITextProcessingService } from "./services/textProcessorService";
import pLimit from 'p-limit';


export class AppController {
	constructor(
		private noteService: NoteService,
		private embeddingService: EmbeddingService,
		private textProcessor: ITextProcessingService
	) { }

	private async getProcessedNoteContent(path: string) {
		const content = await this.noteService.getNoteContent(path);
		return this.textProcessor.processText(content);
	}

	async reindexCurrentActive(): Promise<void> {
		const path = this.noteService.activeNotePath();
		const text = await this.getProcessedNoteContent(path);
		this.embeddingService.update(path, text);
	}

	async reindexAll(): Promise<void> {
		await this.embeddingService.deleteAll();
		this.indexAll();
	}

	async indexAll(): Promise<void> {
		const paths = await this.noteService.getAllNotePaths();
		const limit = pLimit(5); // Limit to 5 concurrent requests

		await Promise.all(
			paths.map((path) =>
				limit(async () => {
					const text = await this.getProcessedNoteContent(path);
					await this.embeddingService.create(path, text);
				})
			)
		);
	}

	async getActiveNoteRelations(limit: number): Promise<RelatedNote[]> {
		const currentPath = this.noteService.activeNotePath();
		const text = await this.getProcessedNoteContent(currentPath);
		const similarNotes = await this.searchSimilarNotes(text, limit + 1); // +1 to remove itself later
		return similarNotes.filter(note => note.path !== currentPath);
	}

	async searchSimilarNotes(text: string, limit: number): Promise<RelatedNote[]> {
		const results = await this.embeddingService.fetchSimilar(text, limit);
		return results.map(result => ({
			similarity: result.similarity,
			title: this.noteService.getNoteTitleFromPath(result.id),
			path: result.id
		}))
	}
}
