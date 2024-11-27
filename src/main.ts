import { Plugin, Notice } from 'obsidian';
import { NoteService } from './services/noteService';
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from './views/RelatedNotesListView';
import { AppController } from './controller';
import { EmbeddingService } from './services/embeddingService';
import { MarkdownTextProcessingService } from './services/textProcessorService';
import path from 'path';
import { RelatedNotesSettingTab } from './settings';

export interface RelatedNotesSettings {
	maxRelatedNotes: number;
	pluginServerPort: number;
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
	maxRelatedNotes: 5,
	pluginServerPort: 3000
};


export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;
	private controller: AppController;

	async onload() {
		await this.loadSettings();

		this.controller = this.setupController();
		if (!(await this.loadData()).initialized) {
			this.controller.reindexAll();
			this.saveData({ initialized: true })
		}

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, this.controller)
		);

		this.addSettingTab(new RelatedNotesSettingTab(this.app, this));

		this.addRibbonIcon('list-ordered', 'Related Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'related-notes-reindex-all',
			name: 'Related Notes: Refresh relations of all notes',
			callback: () => {
				this.controller.reindexAll();
			}
		});
		this.addCommand({
			id: 'related-notes-reindex-note',
			name: 'Related Notes: Refresh current note\'s relations',
			callback: () => {
				this.controller.reindexCurrentActive();
			}
		});
		this.addCommand({
			id: 'related-notes-show-related',
			name: 'Related Notes: Show Related Notes',
			callback: () => {
				this.activateView();
			}
		});

		this.app.vault.on("delete", (file) => {
			this.controller.deleteNoteFromIndex(file.path);
		});

		// Listen for active file changes
		this.app.workspace.on('file-open', () => {
			this.updateRelatedNotesView();
		});

		// Ensure the view is present in the sidebar on load
		this.app.workspace.onLayoutReady(() => {
			this.openRelatedNotesView();
		});
	}

	onunload() {
		this.controller.unload();
		this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES).forEach((leaf) => leaf.detach());
	}

	private openRelatedNotesView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_RELATED_NOTES);
		const leaf = this.app.workspace.getRightLeaf(false);
		leaf?.setViewState({ type: VIEW_TYPE_RELATED_NOTES, active: true });
	}

	private updateRelatedNotesView() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES).first();
		if (leaf && leaf.view instanceof RelatedNotesListView) {
			leaf.view.refresh();
		}
	}

	private async activateView() {
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES)[0];

		if (!leaf) {
			const newLeaf = this.app.workspace.getRightLeaf(true);
			if (!newLeaf) {
				new Notice('Unable to activate the Related Notes view.');
				return;
			}

			leaf = newLeaf;
			await leaf.setViewState({ type: VIEW_TYPE_RELATED_NOTES, active: true });
		}
		this.app.workspace.revealLeaf(leaf);
	}

	private getPluginDir() {
		// @ts-ignore
		const vaultDir = this.app.vault.adapter.getBasePath();
		return path.join(vaultDir, '.obsidian', 'plugins', 'related-notes');
	}

	private setupController(): AppController {
		const textProcessor = new MarkdownTextProcessingService();
		const embeddingService = new EmbeddingService(this.settings.pluginServerPort, this.getPluginDir());
		const noteService = new NoteService(this.app);
		return new AppController(this, noteService, embeddingService, textProcessor);
	}

	async loadSettings() {
		if (!(await this.loadData())) {
			this.saveData({ initialized: false });
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}