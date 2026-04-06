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
	SimilaritySettings,
	StatusReporter,
} from "../types";
import { DEFAULT_SETTINGS } from "../constants";
import { isPathIgnored } from "../domain/ignoreRules";

export type AppServices = {
	status: StatusReporter;
	noteSource: NoteSource;
	indexStorage: IndexStorage;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
	settings: SimilaritySettings;

	indexNote: IndexNoteUseCase;
	getSimilarNotes: GetSimilarNotesUseCase;
	syncIndexToVault: SyncIndexToVaultUseCase;
	loadSettings(): Promise<void>;
	saveSettings(): Promise<void>;
	isIgnoredPath(path: string): boolean;
	countVaultNotesForIgnoredPaths(ignoredPaths: string[]): number;
	saveIgnoredPathsAndSync(ignoredPaths: string[]): Promise<{ indexed: number; deleted: number } | undefined>;

	upsertDebouncer: KeyedDebouncer<string>;

	shutdown(): void;
};

export function buildAppServices(plugin: Plugin): AppServices {
	const status = new ObsidianStatusBar(plugin);
	const noteSource = new ObsidianNoteSource(plugin);
	const indexStorage = new ObsidianPluginDataIndexStorage(plugin);
	const embedder = new EmbeddingProvider();
	const indexRepo = new JsonIndexedNoteRepository(indexStorage);
	const settings: SimilaritySettings = {...DEFAULT_SETTINGS};

	const isIgnoredPath = (path: string) => isPathIgnored(path, settings.ignoredPaths);

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
		isIgnoredPath,
	});

	const executeSyncActions = makeExecuteSyncActions({
		indexNote,
		indexRepo,
	});

	const syncIndexToVault = makeSyncIndexToVault({
		getSyncActions,
		executeSyncActions,
	});

	const loadSettings = async (): Promise<void> => {
		const data = (await plugin.loadData()) ?? {};
		const loadedSettings = (data.settings ?? data) as Partial<SimilaritySettings>;

		settings.ignoredPaths = Array.isArray(loadedSettings.ignoredPaths)
			? loadedSettings.ignoredPaths
			: DEFAULT_SETTINGS.ignoredPaths;
	};

	const saveSettings = async (): Promise<void> => {
		const data = (await plugin.loadData()) ?? {};
		await plugin.saveData({...data, settings});
	};

	const countVaultNotesForIgnoredPaths = (ignoredPaths: string[]): number => {
		const noteIds = noteSource.listIds();
		return noteIds.filter((noteId) => isPathIgnored(noteId, ignoredPaths)).length;
	};

	const saveIgnoredPathsAndSync = async (ignoredPaths: string[]) => {
		settings.ignoredPaths = ignoredPaths;
		await saveSettings();
		if (!await indexStorage.isEmpty()) {
			return await syncIndexToVault();
		}
	};

	const upsertDebouncer = new KeyedDebouncer<string>(1100);

	return {
		status,
		noteSource,
		indexStorage,
		embedder,
		indexRepo,
		settings,
		indexNote,
		getSimilarNotes,
		syncIndexToVault,
		loadSettings,
		saveSettings,
		isIgnoredPath,
		countVaultNotesForIgnoredPaths,
		saveIgnoredPathsAndSync,
		upsertDebouncer,
		shutdown() {
			upsertDebouncer.cancel();
			embedder.unload();
			status.clear();
		},
	};
}
