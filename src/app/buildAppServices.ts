import { Plugin } from "obsidian";
import { KeyedDebouncer } from "../domain/debouncer";
import { ObsidianStatusBar } from "../infra/obsidian/obsidianStatusBar";
import { ObsidianNoteSource } from "../infra/obsidian/obsidianNoteSource";
import { ObsidianPluginDataIndexStorage } from "../infra/obsidian/obsidianStorage";
import { EmbeddingProvider } from "../infra/embedder/embeddingProvider";
import { JsonIndexedNoteRepository } from "../infra/index/jsonIndexedNoteRepository";
import { IndexNoteUseCase, makeIndexNote } from "./indexNote";
import { GetSimilarNotesUseCase, makeGetSimilarNotes } from "./getSimilarNotes";
import { makeSyncIndexToVault, SyncIndexToVaultUseCase } from "./syncIndexToVault";
import { makeGetSyncActions } from "./getSyncActions";
import { makeExecuteSyncActions } from "./executeSyncActions";
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

export type AppServices = {
	status: StatusReporter;
	noteSource: NoteSource;
	indexStorage: IndexStorage;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
	settingsRepo: SettingsRepository;

	indexNote: IndexNoteUseCase;
	getSimilarNotes: GetSimilarNotesUseCase;
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
	const noteSource = new ObsidianNoteSource(plugin);
	const storage = new ObsidianPluginDataStore(plugin);
	const indexStorage = new ObsidianPluginDataIndexStorage(storage);
	const embedder = new EmbeddingProvider();
	const indexRepo = new JsonIndexedNoteRepository(indexStorage);
	const settingsRepo = new ObsidianSettingsRepository(storage);

	const isIgnoredPath = makeIsIgnoredPath({
		settingsRepo,
	})

	const indexNote = makeIndexNote({
		noteSource,
		embedder,
		indexRepo,
		isIgnoredPath,
	});

	const getSimilarNotes = makeGetSimilarNotes({
		indexRepo,
		embedder,
	});

	const getSyncActions = makeGetSyncActions({
		noteSource,
		indexRepo,
		settingsRepo,
	});

	const executeSyncActions = makeExecuteSyncActions({
		indexNote,
		indexRepo,
	});

	const syncIndexToVault = makeSyncIndexToVault({
		getSyncActions,
		executeSyncActions,
	});

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
