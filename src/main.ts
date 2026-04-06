import { Notice, Plugin } from "obsidian";
import { SearchModal } from "./ui/SearchModal";
import { initializePlugin } from "./app/initializePlugin";
import { AppServices, buildAppServices } from "./app/buildAppServices";
import { SimilarNotesListView, VIEW_TYPE_SIMILARITY } from "./ui/SimilarNotesListView";
import { activateRightLeafView } from "./app/activateRightLeafView";
import { SettingView } from "./ui/SettingsView";

export default class RelatedNotes extends Plugin {
	private appServices!: AppServices;
	private settingsLoaded: Promise<void> = Promise.resolve();

	onload(): void {
		this.appServices = buildAppServices(this);
		this.appServices.status.update("Loading…");

		this.settingsLoaded = this.appServices.loadSettings();
		this.addSettingTab(new SettingView(this.app, this, this.appServices));

		this.registerView(
			VIEW_TYPE_SIMILARITY,
			(leaf) => new SimilarNotesListView(leaf, {
				indexRepo: this.appServices.indexRepo,
				noteSource: this.appServices.noteSource,
				indexNote: this.appServices.indexNote,
				getSimilarNotes: this.appServices.getSimilarNotes,
				indexVault: this.appServices.syncIndexToVault,
				getIgnoredPaths: () => this.appServices.settings.ignoredPaths,
				isIgnoredPath: (path: string) => this.appServices.isIgnoredPath(path),
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
			void this.settingsLoaded.then(() => initializePlugin(this, this.appServices));
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
