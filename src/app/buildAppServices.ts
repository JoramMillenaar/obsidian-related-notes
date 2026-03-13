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
import { EmbeddingPort, IndexRepository, IndexStorage, NoteSource, StatusReporter, } from "../types";

export type AppServices = {
	status: StatusReporter;
	noteSource: NoteSource;
	indexStorage: IndexStorage;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;

	indexNote: IndexNoteUseCase;
	getSimilarNotes: GetSimilarNotesUseCase;
	syncIndexToVault: SyncIndexToVaultUseCase;

	upsertDebouncer: KeyedDebouncer<string>;

	shutdown(): void;
};

export function buildAppServices(plugin: Plugin): AppServices {
	const status = new ObsidianStatusBar(plugin);
	const noteSource = new ObsidianNoteSource(plugin);
	const indexStorage = new ObsidianPluginDataIndexStorage(plugin);
	const embedder = new EmbeddingProvider();
	const indexRepo = new JsonIndexedNoteRepository(indexStorage);

	const indexNote = makeIndexNote({
		noteSource,
		embedder,
		indexRepo,
	});

	const getSimilarNotes = makeGetSimilarNotes({
		indexRepo,
		embedder,
	});

	const getSyncActions = makeGetSyncActions({
		noteSource,
		indexRepo,
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

	return {
		status,
		noteSource,
		indexStorage,
		embedder,
		indexRepo,
		indexNote,
		getSimilarNotes,
		syncIndexToVault,
		upsertDebouncer,
		shutdown() {
			upsertDebouncer.cancel();
			embedder.unload();
			status.clear();
		},
	};
}
