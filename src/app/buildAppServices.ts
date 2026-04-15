import { Plugin } from "obsidian";
import { KeyedDebouncer } from "../domain/debouncer";
import { ObsidianStatusBar } from "../infra/obsidian/obsidianStatusBar";
import { ObsidianMarkdownTextExtractor } from "../infra/obsidian/obsidianMarkdownTextExtractor";
import { ObsidianNoteSource } from "../infra/obsidian/obsidianNoteSource";
import { ObsidianPluginDataIndexStorage } from "../infra/obsidian/obsidianStorage";
import { EmbeddingProvider } from "../infra/embedder/embeddingProvider";
import { JsonIndexedNoteRepository } from "../infra/index/jsonIndexedNoteRepository";
import { IndexNoteUseCase, makeIndexNote } from "./indexNote";
import { GetSimilarNotesUseCase, makeGetSimilarNotes } from "./getSimilarNotes";
import { InsertWikilinkAtCursorUseCase, makeInsertWikilinkAtCursor } from "./insertWikilinkAtCursor";
import { makeSyncIndexToVault, SyncIndexToVaultUseCase } from "./syncIndexToVault";
import { makeEmbedChunks, makeEmbedText } from "./embedText";
import {
	EmbeddingPort,
	IndexRepository,
	IndexStorage,
	MarkdownTextExtractor,
	NoteSource,
	SettingsRepository,
	StatusReporter,
} from "../types";
import { ObsidianPluginDataStore } from "../infra/obsidian/obsidianPluginDataStore";
import { ObsidianSettingsRepository } from "../infra/obsidian/obsidianSettings";
import { IsIgnoredPath, makeIsIgnoredPath } from "./isIgnoredPath";
import { makeUpdateSettings, UpdateSettingsUseCase } from "./updateSettings";
import {
	IsInitialIndexCompletedUseCase,
	makeIsInitialIndexCompleted,
	makeMarkInitialIndexCompleted,
	MarkInitialIndexCompletedUseCase,
} from "./initialIndexState";
import { ObsidianActiveEditor } from "../infra/obsidian/obsidianActiveEditor";
import { makePrepareNoteForEmbedding, PrepareNoteForEmbeddingUseCase } from "./prepareNoteForEmbedding";
import {
	AwaitIndexedNoteUseCase,
	BumpIndexPriorityUseCase,
	GetIndexingStateUseCase,
	makeIndexingCoordinator,
	StartOrRefreshIndexSyncUseCase,
	SubscribeIndexingStateUseCase,
} from "./indexingCoordinator";

export type AppServices = {
	status: StatusReporter;
	noteSource: NoteSource;
	markdownTextExtractor: MarkdownTextExtractor;
	indexStorage: IndexStorage;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
	settingsRepo: SettingsRepository;

	indexNote: IndexNoteUseCase;
	prepareNoteForEmbedding: PrepareNoteForEmbeddingUseCase;
	getSimilarNotes: GetSimilarNotesUseCase;
	insertWikilinkAtCursor: InsertWikilinkAtCursorUseCase;
	syncIndexToVault: SyncIndexToVaultUseCase;
	startOrRefreshIndexSync: StartOrRefreshIndexSyncUseCase;
	bumpIndexPriority: BumpIndexPriorityUseCase;
	awaitIndexedNote: AwaitIndexedNoteUseCase;
	subscribeIndexingState: SubscribeIndexingStateUseCase;
	getIndexingState: GetIndexingStateUseCase;
	isIgnoredPath: IsIgnoredPath;
	updateSettings: UpdateSettingsUseCase;
	isInitialIndexCompleted: IsInitialIndexCompletedUseCase;
	markInitialIndexCompleted: MarkInitialIndexCompletedUseCase;

	upsertDebouncer: KeyedDebouncer<string>;

	shutdown(): void;
};

export function buildAppServices(plugin: Plugin): AppServices {
	const status = new ObsidianStatusBar(plugin);
	const noteSource = new ObsidianNoteSource(plugin);
	const markdownTextExtractor = new ObsidianMarkdownTextExtractor(plugin);
	const storage = new ObsidianPluginDataStore(plugin);
	const indexStorage = new ObsidianPluginDataIndexStorage(storage);
	const embedder = new EmbeddingProvider();
	const embedText = makeEmbedText({embedder});
	const embedChunks = makeEmbedChunks({embedder});
	const indexRepo = new JsonIndexedNoteRepository(indexStorage);
	const settingsRepo = new ObsidianSettingsRepository(storage);
	const activeEditor = new ObsidianActiveEditor(plugin);

	const isIgnoredPath = makeIsIgnoredPath({
		settingsRepo,
	})

	const prepareNoteForEmbedding = makePrepareNoteForEmbedding({
		noteSource,
		markdownTextExtractor,
		settingsRepo,
	});

	const indexNote = makeIndexNote({
		prepareNoteForEmbedding,
		embedChunks,
		indexRepo,
		isIgnoredPath,
	});

	const getSimilarNotes = makeGetSimilarNotes({
		indexRepo,
		embedText,
		embedChunks,
		prepareNoteForEmbedding,
	});

	const insertWikilinkAtCursor = makeInsertWikilinkAtCursor({
		activeEditor,
		noteSource,
	});

	const indexingCoordinator = makeIndexingCoordinator({
		noteSource,
		indexRepo,
		settingsRepo,
		indexNote,
	});

	const syncIndexToVault = makeSyncIndexToVault({
		startOrRefreshSync: indexingCoordinator.startOrRefreshSync,
		subscribe: indexingCoordinator.subscribe,
	});

	const upsertDebouncer = new KeyedDebouncer<string>(1100);

	const updateSettings = makeUpdateSettings({
		settingsRepo,
		indexStorage,
		startOrRefreshIndexSync: indexingCoordinator.startOrRefreshSync,
	})
	const isInitialIndexCompleted = makeIsInitialIndexCompleted({settingsRepo});
	const markInitialIndexCompleted = makeMarkInitialIndexCompleted({settingsRepo});

	return {
		status,
		noteSource,
		markdownTextExtractor,
		indexStorage,
		embedder,
		indexRepo,
		settingsRepo,
		indexNote,
		prepareNoteForEmbedding,
		getSimilarNotes,
		insertWikilinkAtCursor,
		syncIndexToVault,
		startOrRefreshIndexSync: indexingCoordinator.startOrRefreshSync,
		bumpIndexPriority: indexingCoordinator.bumpPriority,
		awaitIndexedNote: indexingCoordinator.awaitNote,
		subscribeIndexingState: indexingCoordinator.subscribe,
		getIndexingState: indexingCoordinator.getSnapshot,
		isIgnoredPath,
		updateSettings,
		isInitialIndexCompleted,
		markInitialIndexCompleted,
		upsertDebouncer,
		shutdown() {
			indexingCoordinator.unload();
			upsertDebouncer.cancel();
			embedder.unload();
			status.clear();
		},
	};
}
