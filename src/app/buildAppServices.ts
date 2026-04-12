import { Plugin } from "obsidian";
import { KeyedDebouncer } from "../domain/debouncer";
import { ObsidianStatusBar } from "../infra/obsidian/obsidianStatusBar";
import { ObsidianNoteSource } from "../infra/obsidian/obsidianNoteSource";
import { ObsidianPluginDataIndexStorage } from "../infra/obsidian/obsidianStorage";
import { EmbeddingProvider } from "../infra/embedder/embeddingProvider";
import { JsonIndexedNoteRepository } from "../infra/index/jsonIndexedNoteRepository";
import { IndexNoteUseCase, makeIndexNote } from "./indexNote";
import { GetSimilarNotesUseCase, makeGetSimilarNotes } from "./getSimilarNotes";
import { InsertWikilinkAtCursorUseCase, makeInsertWikilinkAtCursor } from "./insertWikilinkAtCursor";
import { GetPerformanceReportUseCase, makeGetPerformanceReport } from "./getPerformanceReport";
import { ResetPerformanceReportUseCase, makeResetPerformanceReport } from "./resetPerformanceReport";
import { makeSyncIndexToVault, SyncIndexToVaultUseCase } from "./syncIndexToVault";
import { makeGetSyncActions } from "./getSyncActions";
import { makeExecuteSyncActions } from "./executeSyncActions";
import { makeEmbedText } from "./embedText";
import {
	EmbeddingPort,
	IndexRepository,
	IndexStorage,
	NoteSource,
	SettingsRepository,
	StatusReporter,
} from "../types";
import { ObsidianPluginDataStore } from "../infra/obsidian/obsidianPluginDataStore";
import { ObsidianSettingsRepository } from "../infra/obsidian/obsidianSettings";
import { IsIgnoredPath, makeIsIgnoredPath } from "./isIgnoredPath";
import { makeUpdateIgnoredPaths, UpdateIgnoredPathsUseCase } from "./updateIgnoredPaths";
import {
	IsInitialIndexCompletedUseCase,
	makeIsInitialIndexCompleted,
	makeMarkInitialIndexCompleted,
	MarkInitialIndexCompletedUseCase,
} from "./initialIndexState";
import { ObsidianActiveEditor } from "../infra/obsidian/obsidianActiveEditor";
import { ObsidianPerformanceMonitor } from "../infra/obsidian/obsidianPerformanceMonitor";

export type AppServices = {
	status: StatusReporter;
	noteSource: NoteSource;
	indexStorage: IndexStorage;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
	settingsRepo: SettingsRepository;

	indexNote: IndexNoteUseCase;
	getSimilarNotes: GetSimilarNotesUseCase;
	insertWikilinkAtCursor: InsertWikilinkAtCursorUseCase;
	getPerformanceReport: GetPerformanceReportUseCase;
	resetPerformanceReport: ResetPerformanceReportUseCase;
	syncIndexToVault: SyncIndexToVaultUseCase;
	isIgnoredPath: IsIgnoredPath;
	updateIgnoredPaths: UpdateIgnoredPathsUseCase;
	isInitialIndexCompleted: IsInitialIndexCompletedUseCase;
	markInitialIndexCompleted: MarkInitialIndexCompletedUseCase;

	upsertDebouncer: KeyedDebouncer<string>;

	shutdown(): void;
};

export function buildAppServices(plugin: Plugin): AppServices {
	const status = new ObsidianStatusBar(plugin);
	const performanceMonitor = new ObsidianPerformanceMonitor();
	const noteSource = new ObsidianNoteSource(plugin, performanceMonitor);
	const storage = new ObsidianPluginDataStore(plugin, performanceMonitor);
	const indexStorage = new ObsidianPluginDataIndexStorage(storage);
	const embedder = new EmbeddingProvider(performanceMonitor);
	const embedText = makeEmbedText({ embedder });
	const indexRepo = new JsonIndexedNoteRepository(indexStorage, performanceMonitor);
	const settingsRepo = new ObsidianSettingsRepository(storage);
	const activeEditor = new ObsidianActiveEditor(plugin);

	const isIgnoredPath = makeIsIgnoredPath({
		settingsRepo,
	})

	const indexNote = makeIndexNote({
		noteSource,
		embedText,
		indexRepo,
		isIgnoredPath,
		performanceMonitor,
	});

	const getSimilarNotes = makeGetSimilarNotes({
		indexRepo,
		embedText,
		performanceMonitor,
	});

	const insertWikilinkAtCursor = makeInsertWikilinkAtCursor({
		activeEditor,
		noteSource,
	});

	const getSyncActions = makeGetSyncActions({
		noteSource,
		indexRepo,
		settingsRepo,
		performanceMonitor,
	});

	const executeSyncActions = makeExecuteSyncActions({
		indexNote,
		indexRepo,
		performanceMonitor,
	});

	const syncIndexToVault = makeSyncIndexToVault({
		getSyncActions,
		executeSyncActions,
		performanceMonitor,
	});

	const getPerformanceReport = makeGetPerformanceReport({performanceMonitor});
	const resetPerformanceReport = makeResetPerformanceReport({performanceMonitor});

	const upsertDebouncer = new KeyedDebouncer<string>(1100);

	const updateIgnoredPaths = makeUpdateIgnoredPaths({
		settingsRepo,
		indexStorage,
		syncIndexToVault
	})
	const isInitialIndexCompleted = makeIsInitialIndexCompleted({settingsRepo});
	const markInitialIndexCompleted = makeMarkInitialIndexCompleted({settingsRepo});

	return {
		status,
		noteSource,
		indexStorage,
		embedder,
		indexRepo,
		settingsRepo,
		indexNote,
		getSimilarNotes,
		insertWikilinkAtCursor,
		getPerformanceReport,
		resetPerformanceReport,
		syncIndexToVault,
		isIgnoredPath,
		updateIgnoredPaths,
		isInitialIndexCompleted,
		markInitialIndexCompleted,
		upsertDebouncer,
		shutdown() {
			upsertDebouncer.cancel();
			embedder.unload();
			status.clear();
		},
	};
}
