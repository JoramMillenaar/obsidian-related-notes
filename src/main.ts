import { Notice, Plugin, TFile } from "obsidian";
import { RelatedNotesListView, VIEW_TYPE_SEMANTIC_NOTES } from "./ui/RelatedNotesListView";
import { RelatedNotesFacade } from "./facade";
import { buildDeps } from "./infra/obsidian/buildDeps";
import { StatusBarService } from "./services/statusBarService";

export default class RelatedNotes extends Plugin {
	private facade!: RelatedNotesFacade;
	private status!: StatusBarService;

	async onload() {
		this.status = new StatusBarService(this);
		this.status.update("Loading…", null);

		const deps = buildDeps(this);
		this.facade = new RelatedNotesFacade(deps);

		this.registerView(
			VIEW_TYPE_SEMANTIC_NOTES,
			(leaf) => new RelatedNotesListView(leaf, this.facade)
		);

		this.addCommand({
			id: "related-notes-sync-vault",
			name: "Semantic Notes: Sync vault index",
			callback: async () => {
				this.status.update("Syncing vault index…", null);
				try {
					await this.facade.syncVaultToIndex({
						onProgress: (p) => {
							this.status.update(`${p.processed}/${p.total} indexed`, null);
						},
					});
					this.status.update("Index synced", 2500);
					new Notice("Semantic Notes index synced");
				} catch (e) {
					this.status.update("Sync failed (see console)", 5000);
					console.error("[Semantic Notes] Sync failed", e);
					new Notice("Semantic Notes sync failed");
				}
			},
		});

		this.addCommand({
			id: "semantic-notes-reindex-current",
			name: "Semantic Notes: Refresh current note",
			callback: async () => {
				const f = this.app.workspace.getActiveFile();
				if (!f) return;

				this.status.update("Indexing current note…", null);
				try {
					await this.facade.upsertNoteToIndex(f.path);
					this.refreshView();
					this.status.update("Current note indexed", 2000);
				} catch (e) {
					this.status.update("Index failed (see console)", 5000);
					console.error("[Semantic Notes] Reindex current failed", e);
				}
			},
		});

		this.app.workspace.onLayoutReady(() => {
			void this.initAfterLayoutReady();
		});
	}

	private async initAfterLayoutReady() {
		this.status.update("Starting…", null);

		try {
			await this.facade.start();
			this.status.update("Ready", 1500);
		} catch (e) {
			this.status.update("Failed to start (see console)", 8000);
			console.error("[Semantic Notes] start() failed", e);
		}

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (!(file instanceof TFile)) return;
				void this.facade.upsertNoteToIndex(file.path).catch((error) => {
					console.error("[Semantic Notes] Reindex failed", error);
				});
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (!(file instanceof TFile)) return;
				void this.facade.deleteNote(file.path).catch((error) => {
					console.error("[Semantic Notes] Delete from index failed", error);
				});
				this.status.update("Note removed from index", 1500);
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				void this.facade.renameNote(oldPath, file.path).catch((error) => {
					console.error("[Semantic Notes] Rename note failed", error);
				});
				void this.facade.upsertNoteToIndex(file.path).catch((error) => {
					console.error("[Semantic Notes] Reindex after rename failed", error);
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
		this.facade.stop();
		this.status?.unload();
	}

	private refreshView() {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SEMANTIC_NOTES).first();
		if (leaf && leaf.view instanceof RelatedNotesListView) void leaf.view.refresh();
	}

	private async activateView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SEMANTIC_NOTES);
		if (existing.length) return;

		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return void new Notice("Unable to activate semantic notes view.");

		await leaf.setViewState({type: VIEW_TYPE_SEMANTIC_NOTES, active: false});
	}
}
