import { Notice, Plugin } from "obsidian";
import { SearchModal } from "./ui/SearchModal";
import { initializePlugin } from "./app/initializePlugin";
import { AppServices, buildAppServices } from "./app/buildAppServices";
import { SimilarNotesListView, VIEW_TYPE_SIMILARITY } from "./ui/SimilarNotesListView";
import { activateRightLeafView } from "./app/activateRightLeafView";
import { SettingView } from "./ui/SettingsView";
import { isMarkdownPath } from "./domain/markdownPath";

export default class RelatedNotes extends Plugin {
	private appServices!: AppServices;

	onload(): void {
		this.appServices = buildAppServices(this);
		this.appServices.status.update("Loading…");

		this.addSettingTab(new SettingView(this.app, this, {
			settingsRepo: this.appServices.settingsRepo,
			updateIgnoredPaths: this.appServices.updateIgnoredPaths
		}));

		this.registerView(
			VIEW_TYPE_SIMILARITY,
			(leaf) =>
				new SimilarNotesListView(leaf, {
					indexRepo: this.appServices.indexRepo,
					noteSource: this.appServices.noteSource,
					indexNote: this.appServices.indexNote,
					getSimilarNotes: this.appServices.getSimilarNotes,
					indexVault: this.appServices.syncIndexToVault,
					isIgnoredPath: this.appServices.isIgnoredPath,
					isInitialIndexCompleted: this.appServices.isInitialIndexCompleted,
					markInitialIndexCompleted: this.appServices.markInitialIndexCompleted,
				})
		);

		this.addCommand({
			id: "sync-vault",
			name: "Sync vault index",
			callback: async () => {
				this.appServices.status.update("Syncing vault index…");
				try {
					await this.appServices.syncIndexToVault({
						onProgress: (p) => {
							this.appServices.status.update(`${p.processed}/${p.total} indexed`);
						},
					});
					await this.appServices.markInitialIndexCompleted();
					this.refreshView();
					this.appServices.status.update("Index synced", 2500);
					new Notice("Similarity index synced");
				} catch (error) {
					this.appServices.status.update("Sync failed (see console)", 5000);
					console.error("[Similarity] Sync failed", error);
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
				if (!isMarkdownPath(f.path)) {
					this.appServices.status.update("Only Markdown notes are indexed", 3000);
					this.refreshView();
					return;
				}

				this.appServices.status.update("Indexing current note…");
				try {
					await this.appServices.indexNote(f.path);
					this.refreshView();
					this.appServices.status.update("Current note indexed", 2000);
				} catch (error) {
					this.appServices.status.update("Index failed (see console)", 5000);
					console.error("[Similarity] Reindex current failed", error);
				}
			},
		});

		this.addCommand({
			id: "open-search-modal",
			name: "Open semantic search",
			callback: () => {
				new SearchModal(this.app, {
					getSimilarNotes: this.appServices.getSimilarNotes,
					insertWikilinkAtCursor: this.appServices.insertWikilinkAtCursor,
					isInitialIndexCompleted: this.appServices.isInitialIndexCompleted,
					indexRepo: this.appServices.indexRepo,
					noteSource: this.appServices.noteSource,
					isIgnoredPath: this.appServices.isIgnoredPath,
				}).open();
			},
		});

		this.addCommand({
			id: "open-similar-notes",
			name: "Open similar notes",
			callback: async () => {
				await activateRightLeafView(this, {reveal: true, focus: true});
			},
		});

		this.app.workspace.onLayoutReady(() => {
			void initializePlugin(this, this.appServices);
		});
	}

	onunload(): void {
		this.appServices.shutdown();
	}

	private refreshView(): void {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIMILARITY).first();
		if (leaf && leaf.view instanceof SimilarNotesListView) {
			void leaf.view.refresh();
		}
	}
}
