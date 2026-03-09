export type Embedding = number[];

export type IndexedNote = {
	id: string;
	embedding: number[];
	contentHash: string,
	updatedAt: string,
};

export type RelatedNote = {
	id: string;
	score: number;
};

export interface IframeMessage {
	requestId: number;
	payload: string;
}

export interface EmbeddingPort {
	embed(text: string): Promise<number[] | null>;

	load(): Promise<void>;

	unload(): void;
}

export interface IndexedNoteRepository {
	findById(noteId: string): Promise<IndexedNote | null>;

	upsert(note: IndexedNote): Promise<void>;

	upsertMany(notes: IndexedNote[]): Promise<void>;

	remove(noteId: string): Promise<void>;

	rename(oldId: string, newId: string): Promise<void>;
}

export interface IndexStorage {
	getIndex(): Promise<IndexedNote[]>;

	saveIndex(index: IndexedNote[]): Promise<void>;

	isIndexEmpty(): Promise<boolean>;
}

export interface NoteSource {
	getNoteText(noteId: string): Promise<string>;

	listNoteIds(): string[];

	isNoteEmpty(noteId: string): Promise<boolean>;
}

export interface StatusReporter {
	update(text: string, timeout?: number): void;

	clear(): void;
}

export type OnProgressCallback = (p: { phase: string; processed: number; total: number }) => void;
