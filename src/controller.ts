import { EmbeddingService } from "./services/embeddingService";
import { NoteService, RelatedNote } from "./services/noteService";
import { ITextProcessingService } from "./services/textProcessorService";
import pLimit from 'p-limit';
import { StatusBarService } from "./services/statusBarService";
import { getNoteTitleFromPath, logError } from "./services/utils";
import { VectraDatabaseController } from "./indexController";
import { basename } from "path";

export class AppController {

	constructor(
		private statusBar: StatusBarService,
		private noteService: NoteService,
		private embeddingService: EmbeddingService,
		private textProcessor: ITextProcessingService,
		private indexController: VectraDatabaseController
	) { }

	private async getProcessedNoteContent(path: string) {
		const content = await this.noteService.getNoteContent(path);
		const fileName = basename(path);
		const updatedContent = `${fileName}\n${content}`;
		return this.textProcessor.processText(updatedContent);
	}

	async ready(): Promise<void> {
		await this.indexController.ready();
		return await this.embeddingService.ready();
	}

	unload() {}

	async reindexCurrentActive(): Promise<void> {
		const path = this.noteService.activeNotePath();
		if (!path) return;
		const text = await this.getProcessedNoteContent(path);
		const embedding = await this.embeddingService.embed(text);
		try {
			await this.indexController.delete(path);
			await this.indexController.create(path, embedding, {});
		} catch (error) {
			if (error instanceof Error && error.message.includes("EmbeddingDoesNotExist")) {
				await this.indexController.create(path, embedding, {});
			} else {
				logError("Error reindexing active note:", error);
				throw error;
			}
		}
	}

	async reindexAll(): Promise<void> {
		await this.indexController.dropDatabase();
		await this.indexController.ready();
		await this.indexAll();
	}
	
	async indexAll(): Promise<void> {
		this.statusBar.update("Indexing...");
		const paths: string[] = this.noteService.getAllNotePaths();
		const total = paths.length;
		let processed = 0;
		
		const limit = pLimit(5); // Limit to 5 concurrent requests
		await Promise.all(
			paths.map((path) =>
				limit(async () => {
					const text = await this.getProcessedNoteContent(path);
					const embedding = await this.embeddingService.embed(text);
					this.indexController.create(path, embedding, {});
					processed++;
					this.statusBar.update(`Indexing: ${processed}/${total}`);
				})
			)
		);
		this.statusBar.update("Finished Indexing");
	}

	async getActiveNoteRelations(): Promise<RelatedNote[]> {
		const currentPath = this.noteService.activeNotePath();
		if (!currentPath) return [];

		const text = await this.getProcessedNoteContent(currentPath);
		if (!text) return [];

		const similarNotes = await this.searchSimilarNotes(text, 5); // this.plugin.settings.maxRelatedNotes + 1 +1 to account for the current note
		return similarNotes.filter(note => note.path !== currentPath);
	}


	async searchSimilarNotes(text: string, limit: number): Promise<RelatedNote[]> {
		const embedding = await this.embeddingService.embed(text);
		const results = await this.indexController.querySimilar(embedding, limit)
		return results.map(result => ({
			similarity: result.score,
			title: getNoteTitleFromPath(result.id),
			path: result.id
		}))
	}

	async deleteNoteFromIndex(path: string) {
		await this.indexController.delete(path);
	}
}
