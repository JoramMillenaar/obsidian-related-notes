import { IEmbeddingService } from './embeddingService';
import { IIndexService } from './indexService';
import { ITextProcessingService } from './textProcessorService';
import { ITextChunkingService } from './textChunkingService';
import { TFile, Vault } from 'obsidian'; // Assuming you're using Obsidian API

export type RelatedNote = {
	match: number;
	title: string;
	path: string;
};

export type NoteEmbedding = {
	path: string;
	embeddings: Float32Array[];
};

export class NoteService {
	private textProcessingService: ITextProcessingService;
	private textChunkingService: ITextChunkingService;
	private embeddingService: IEmbeddingService;
	private indexService: IIndexService;
	private vault: Vault;

	constructor(
		textProcessingService: ITextProcessingService,
		textChunkingService: ITextChunkingService,
		embeddingService: IEmbeddingService,
		indexService: IIndexService,
		vault: Vault
	) {
		this.textProcessingService = textProcessingService;
		this.textChunkingService = textChunkingService;
		this.embeddingService = embeddingService;
		this.indexService = indexService;
		this.vault = vault;
	}

	async createNoteIndex(path: string): Promise<void> {
		const embedding = await this.generateNoteEmbedding(path);
		this.pushNoteEmbedding(embedding);
	}

	async createManyNoteIndices(paths: string[]): Promise<void> {
		const embeddings = await this.generateManyNoteEmbeddings(paths);
		this.pushManyNoteEmbeddings(embeddings);
	}

	async generateNoteEmbedding(path: string): Promise<NoteEmbedding> {
		// TODO: separate vault concern/IO from this class and pass note content as an argument
		const noteContent = await this.readNoteContent(path);
		const processedText = this.textProcessingService.processText(noteContent);
		// TODO: Dynamically add token limit from embedder + safety margin
		const chunks = this.textChunkingService.chunkText(processedText, 100);
		const embeddings: Float32Array[] = [];

		for (const chunk of chunks) {
			const embedding = await this.embeddingService.generateEmbedding(chunk);
			embeddings.push(embedding);
		}

		return { path, embeddings };
	}

	async generateManyNoteEmbeddings(paths: string[]): Promise<NoteEmbedding[]> {
		const noteEmbeddings: NoteEmbedding[] = [];

		for (const path of paths) {
			const embedding = await this.generateNoteEmbedding(path);
			noteEmbeddings.push(embedding);
		}

		return noteEmbeddings;
	}

	async pushNoteEmbedding(noteEmbedding: NoteEmbedding): Promise<void> {
		for (const embedding of noteEmbedding.embeddings) {
			await this.indexService.insert(embedding, noteEmbedding.path);
		}
	}

	async pushManyNoteEmbeddings(noteEmbeddings: NoteEmbedding[]): Promise<void> {
		for (const noteEmbedding of noteEmbeddings) {
			this.pushNoteEmbedding(noteEmbedding);
		}
	}

	async listRelatedNotes(path: string, count: number): Promise<RelatedNote[]> {
		const noteEmbedding = await this.generateNoteEmbedding(path);
		const embedding = noteEmbedding.embeddings[0]; // Just take the first embedding for now
		const searchResults = await this.indexService.search(embedding, count + 1); // +1 to exclude the note itself

		// Filter out the note itself from the results
		const filteredResults = searchResults.filter(result => result.text !== path).slice(0, count);

		const relatedNotes: RelatedNote[] = [];

		for (const result of filteredResults) {
			const noteTitle = this.getNoteTitleFromPath(result.text);
			relatedNotes.push({
				match: 1 - result.distance,
				title: noteTitle,
				path: result.text,
			});
		}

		return relatedNotes;
	}

	async destroyAllNoteIndices(): Promise<void> {
		await this.indexService.dropIndex();
	}

	private async readNoteContent(path: string): Promise<string> {
		const file = this.vault.getAbstractFileByPath(path);

		if (file instanceof TFile) {
			return await this.vault.read(file);
		} else {
			throw new Error(`Note not found at path: ${path}`);
		}
	}

	private getNoteTitleFromPath(path: string): string {
		const filename = path.split('/').pop() || '';
		return filename.replace('.md', '');
	}
}
