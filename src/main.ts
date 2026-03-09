import { Notice, Plugin, TFile } from "obsidian";
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from "./ui/RelatedNotesListView";
import { KeyedDebouncer } from "./domain/debouncer";
import { SearchModal } from "./ui/SearchModal";
import { ObsidianStatusBar } from "./infra/obsidian/obsidianStatusBar";
import { EmbeddingPort, IndexRepository, NoteSource, StatusReporter } from "./types";
import { JsonIndexedNoteRepository } from "./infra/index/jsonIndexedNoteRepository";
import { ObsidianNoteSource } from "./infra/obsidian/obsidianNoteSource";
import { EmbeddingProvider } from "./infra/embedder/embeddingProvider";
import { ObsidianPluginDataIndexStorage } from "./infra/obsidian/obsidianStorage";
import { IndexNoteUseCase, makeIndexNote } from "./app/indexNote";
import { GetSimilarNotesUseCase, makeGetSimilarNotes } from "./app/getSimilarNotes";
import { makeSyncIndexToVault, SyncIndexToVaultUseCase } from "./app/syncIndexToVault";
import { makeGetSyncActions } from "./app/getSyncActions";
import { makeExecuteSyncActions } from "./app/executeSyncActions";

export default class RelatedNotes extends Plugin {
	private status!: StatusReporter;
	private noteSource!: NoteSource;
	private embedder!: EmbeddingPort;
	private indexRepo!: IndexRepository;

	private indexNote!: IndexNoteUseCase;
	private getSimilarNotes!: GetSimilarNotesUseCase;
	private syncIndexToVault!: SyncIndexToVaultUseCase;

	private upsertDebouncer!: KeyedDebouncer<string>;

	onload() {
		this.status = new ObsidianStatusBar(this);
		this.status.update("Loading…");

		const indexStorage = new ObsidianPluginDataIndexStorage(this);
		this.noteSource = new ObsidianNoteSource(this);
		this.embedder = new EmbeddingProvider();
		this.indexRepo = new JsonIndexedNoteRepository(indexStorage);

		this.indexNote = makeIndexNote({
			noteSource: this.noteSource,
			embedder: this.embedder,
			indexRepo: this.indexRepo,
		});
		this.getSimilarNotes = makeGetSimilarNotes({
			indexRepo: this.indexRepo,
			embedder: this.embedder,
		});
		const getSyncActions = makeGetSyncActions({
			noteSource: this.noteSource,
			indexRepo: this.indexRepo,
		});
		const executeSyncActions = makeExecuteSyncActions({
			indexNote: this.indexNote,
			noteRepo: this.indexRepo,
		});
		this.syncIndexToVault = makeSyncIndexToVault({getSyncActions, executeSyncActions});


		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, {
				indexRepo: this.indexRepo,
				noteSource: this.noteSource,
				indexNote: this.indexNote,
				getSimilarNotes: this.getSimilarNotes,
				indexVault: this.syncIndexToVault,
			})
		);

		this.addCommand({
			id: "sync-vault",
			name: "Sync vault index",
			callback: async () => {
				this.status.update("Syncing vault index…");
				try {
					await this.syncIndexToVault({
						onProgress: (p) => {
							this.status.update(`${p.processed}/${p.total} indexed`);
						},
					});
					this.status.update("Index synced", 2500);
					new Notice("Similarity index synced");
				} catch (e) {
					this.status.update("Sync failed (see console)", 5000);
					console.error("[Similarity] Sync failed", e);
					new Notice("Similarity sync failed");
				}
			},
		});

		this.addCommand({
			id: "reindex-current",
			name: "Refresh current note",
			callback: async () => {
				const f = this.app.workspace.getActiveFile();
				if (!f) return;

				this.status.update("Indexing current note…");
				try {
					await this.indexNote(f.path);
					this.refreshView();
					this.status.update("Current note indexed", 2000);
				} catch (e) {
					this.status.update("Index failed (see console)", 5000);
					console.error("[Similarity] Reindex current failed", e);
				}
			},
		});

		this.addCommand({
			id: "open-search-modal",
			name: "Open semantic search",
			callback: () => {
				new SearchModal(this.app, {getSimilarNotes: this.getSimilarNotes}).open();
			}
		});

		this.app.workspace.onLayoutReady(() => {
			void this.initAfterLayoutReady();
		});
	}

	private async initAfterLayoutReady() {
		this.status.update("Starting…");
		this.upsertDebouncer = new KeyedDebouncer(800);

		try {
			await this.embedder.load();

			const isEmpty = await this.indexRepo.isEmpty();
			if (!isEmpty) {
				this.status.update("Repairing index…");
				try {
					await this.syncIndexToVault({
						onProgress: (p) => {
							this.status.update(`${p.processed}/${p.total} indexed`);
						},
					});
				} catch (e) {
					console.error("[Similarity] Index repair failed", e);
				}
			}

			this.status.update("Ready", 1500);
		} catch (e) {
			this.status.update("Failed to start (see console)", 8000);
			console.error("[Similarity] start() failed", e);
		}

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (!(file instanceof TFile)) return;
				this.upsertDebouncer.schedule(file.path, async () => {
					await this.indexNote(file.path).catch((error) => {
						console.error("[Similarity] Reindex failed", error);
					});
				});
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (!(file instanceof TFile)) return;
				void this.indexRepo.remove(file.path).catch((error) => {
					console.error("[Similarity] Delete from index failed", error);
				});
				this.status.update("Note removed from index", 1500);
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				void this.indexRepo.rename(oldPath, file.path).catch((error) => {
					console.error("[Similarity] Rename note failed", error);
				});
				void this.indexNote(file.path).catch((error) => {
					console.error("[Similarity] Reindex after rename failed", error);
				});
				this.status.update("Index updated (rename)", 1500);
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-open", () => this.refreshView())
		);

		await this.activateView();
	}

	onunload() {
		this.upsertDebouncer.cancel();
		this.embedder.unload();
		this.status?.clear();
	}

	private refreshView() {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES).first();
		if (leaf && leaf.view instanceof RelatedNotesListView) void leaf.view.refresh();
	}

	private async activateView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES);
		if (existing.length) return;

		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return void new Notice("Unable to activate similarity view.");

		await leaf.setViewState({type: VIEW_TYPE_RELATED_NOTES, active: false});
	}
}
