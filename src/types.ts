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

export interface SyncResults {
	indexed: number;
	deleted: number;
}

export interface EmbeddingPort {
	embed(text: string): Promise<number[] | null>;

	load(): Promise<void>;

	unload(): void;
}

export interface IndexRepository {
	findById(noteId: string): Promise<IndexedNote | null>;

	listAll(): Promise<IndexedNote[]>;

	isEmpty(): Promise<boolean>;

	upsert(note: IndexedNote): Promise<void>;

	upsertMany(notes: IndexedNote[]): Promise<void>;

	remove(noteId: string): Promise<void>;

	rename(oldId: string, newId: string): Promise<void>;
}

export interface IndexStorage {
	getAll(): Promise<IndexedNote[]>;

	rewrite(index: IndexedNote[]): Promise<void>;

	isEmpty(): Promise<boolean>;
}

export interface NoteSource {
	getTextById(noteId: string): Promise<string>;

	listIds(): string[];

	isEmpty(noteId: string): Promise<boolean>;
}

export interface ActiveEditor {
	insertTextAtCursor(text: string): boolean;
}

export interface StatusReporter {
	update(text: string, timeout?: number): void;

	clear(): void;
}

export interface SettingsRepository {
	get(): Promise<SimilaritySettings>;

	update(settings: SimilaritySettings): Promise<void>;

	updatePartial(patch: Partial<SimilaritySettings>): Promise<void>;
}

export type OnProgressCallback = (p: { phase: string; processed: number; total: number }) => void;


export interface SimilaritySettings {
	ignoredPaths: string[];
	initialIndexCompleted: boolean;
}

export interface SimilarityPluginData {
	settings: SimilaritySettings;
	index: IndexedNote[];
}
