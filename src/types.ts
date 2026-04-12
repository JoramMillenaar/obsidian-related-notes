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

	clear(): Promise<void>;
}

export interface IndexStorage {
	getAll(): Promise<IndexedNote[]>;

	rewrite(index: IndexedNote[]): Promise<void>;

	isEmpty(): Promise<boolean>;
}

export interface NoteSource {
	getTextById(noteId: string): Promise<string>;

	getTextProfileById(noteId: string): Promise<NoteTextProfile>;

	listIds(): string[];

	isEmpty(noteId: string): Promise<boolean>;
}

export interface ActiveEditor {
	insertTextAtCursor(text: string): boolean;
}

export type PerformanceSample = {
	name: string;
	count: number;
	totalMs: number;
	avgMs: number;
	maxMs: number;
	lastMs: number;
};

export type NoteTextProfile = {
	rawText: string;
	cleanText: string;
	rawChars: number;
	cleanChars: number;
	paragraphCount: number;
};

export type EmbeddingChunkConfig = {
	windowSize: number;
	overlap: number;
};

export type NotePerformanceSample = {
	noteId: string;
	rawChars: number;
	cleanChars: number;
	paragraphCount: number;
	chunkCount: number;
	embedCallsPerNote: number;
	avgInputLengthPerCall: number;
	getTextMs: number;
	embedMs: number;
	saveMs: number;
	totalMs: number;
	outcome: "indexed" | "skipped" | "failed";
	reason?: string;
};

export type PerformancePercentiles = {
	p50: number;
	p90: number;
	p95: number;
	p99: number;
};

export type SchedulerSample = {
	notesProcessed: number;
	durationMs: number;
	notesPerSecond: number;
	yieldCount: number;
	longestBlockMs: number;
	longestYieldGapMs: number;
};

export type PerformanceReport = {
	operations: PerformanceSample[];
	noteProfiles: NotePerformanceSample[];
	embedMsPercentiles: PerformancePercentiles;
	totalMsPercentiles: PerformancePercentiles;
	scheduler: {
		runs: number;
		avgNotesPerSecond: number;
		maxNotesPerSecond: number;
		longestBlockMs: number;
		longestYieldGapMs: number;
	};
	counters: {
		skippedNotes: number;
		failedNotes: number;
		failedEmbeddings: number;
	};
};

export interface PerformanceMonitor {
	measure<T>(name: string, run: () => Promise<T> | T): Promise<T>;

	recordNoteProfile(sample: NotePerformanceSample): void;

	recordSchedulerSample(sample: SchedulerSample): void;

	incrementCounter(name: "skippedNotes" | "failedNotes" | "failedEmbeddings", amount?: number): void;

	getReport(): PerformanceReport;

	reset(): void;
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
