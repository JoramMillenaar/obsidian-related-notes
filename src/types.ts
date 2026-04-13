export type Embedding = number[];

export type RawNote = {
	id: string;
	title: string;
	markdown: string;
};

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

export interface MarkdownTextExtractor {
	extract(markdown: string): Promise<string>;
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
	getNoteById(noteId: string): Promise<RawNote | null>;

	listIds(): string[];
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

export type IndexingWarning =
	| "raw-markdown-truncated"
	| "prepared-text-truncated"
	| "chunk-limit-reached";

export type PrepareNoteRejectReason =
	| "missing-note"
	| "empty-content"
	| "non-semantic-content";

export type PreparedNoteForEmbedding = {
	noteId: string;
	preparedText: string;
	chunks: string[];
	warnings: IndexingWarning[];
};

export type PrepareNoteResult =
	| {
		status: "ready";
		value: PreparedNoteForEmbedding;
	}
	| {
		status: "reject";
		reason: PrepareNoteRejectReason;
		warnings: IndexingWarning[];
	};

export interface SimilaritySettings {
	ignoredPaths: string[];
	initialIndexCompleted: boolean;
	maxRawMarkdownChars: number;
	maxExtractedChars: number;
	maxChunks: number;
	titleWeight: number;
}

export interface SimilarityPluginData {
	settings: SimilaritySettings;
	index: IndexedNote[];
}
