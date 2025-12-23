import { Notice, Plugin, TFile } from "obsidian";
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from "./ui/RelatedNotesListView";
import { RelatedNotesFacade } from "./facade";
import { buildDeps } from "./infra/obsidian/buildDeps";
import { StatusBarService } from "./services/statusBarService";

export default class RelatedNotes extends Plugin {
	private facade!: RelatedNotesFacade;
	private status!: StatusBarService;

	onload() {
		this.status = new StatusBarService(this);
		this.status.update("Loading…", null);

		const deps = buildDeps(this);
		this.facade = new RelatedNotesFacade(deps);

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, this.facade)
		);

		this.addCommand({
			id: "sync-vault",
			name: "Sync vault index",
			callback: async () => {
				this.status.update("Syncing vault index…", null);
				try {
					await this.facade.syncVaultToIndex({
						onProgress: (p) => {
							this.status.update(`${p.processed}/${p.total} indexed`, null);
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

				this.status.update("Indexing current note…", null);
				try {
					await this.facade.upsertNoteToIndex(f.path);
					this.refreshView();
					this.status.update("Current note indexed", 2000);
				} catch (e) {
					this.status.update("Index failed (see console)", 5000);
					console.error("[Similarity] Reindex current failed", e);
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
			console.error("[Similarity] start() failed", e);
		}

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (!(file instanceof TFile)) return;
				void this.facade.upsertNoteToIndex(file.path).catch((error) => {
					console.error("[Similarity] Reindex failed", error);
				});
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (!(file instanceof TFile)) return;
				void this.facade.deleteNote(file.path).catch((error) => {
					console.error("[Similarity] Delete from index failed", error);
				});
				this.status.update("Note removed from index", 1500);
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				void this.facade.renameNote(oldPath, file.path).catch((error) => {
					console.error("[Similarity] Rename note failed", error);
				});
				void this.facade.upsertNoteToIndex(file.path).catch((error) => {
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
		this.facade.stop();
		this.status?.unload();
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
