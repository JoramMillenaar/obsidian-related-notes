import { Plugin, Notice } from 'obsidian';
import { NoteService } from './services/noteService';
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from './views/RelatedNotesListView';
import { AppController } from './controller';
import { EmbeddingService } from './services/embeddingService';
import { MarkdownTextProcessingService } from './services/textProcessorService';
import { RelatedNotesSettingTab } from './settings';
import { VectraDatabaseController } from './indexController';
import { LocalIndex } from './vectra/db';
import { IndexIO, ObsidianPluginFileIndexIO } from './services/IOService';
import { StatusBarService } from './services/statusBarService';

export interface RelatedNotesSettings {
	maxRelatedNotes: number;
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
	maxRelatedNotes: 5,
};


export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;
	private controller: AppController;
	private embeddingService: EmbeddingService;
	private indexIO: IndexIO;
	private statusBar: StatusBarService;

	async onload() {
		this.statusBar = new StatusBarService(this);
		this.statusBar.update('Spinning up', 10000);
		await this.loadSettings();

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
	}

	async onUserEnable() {
		this.embeddingService = new EmbeddingService();
		const textProcessor = new MarkdownTextProcessingService();
		const noteService = new NoteService(this.app);
		// TODO: Lower the amount of dependecy injection here by letting some of these be instantiated inside the dependency itself
		this.indexIO = new ObsidianPluginFileIndexIO(this);
		const localIndex = new LocalIndex(this.indexIO);
		const indexController = new VectraDatabaseController(localIndex);
		this.controller = new AppController(this, this.statusBar, noteService, this.embeddingService, textProcessor, indexController);
		await this.controller.ready();

		if (!(await this.indexIO.retrieveIndex()).items.length) {
			this.controller.reindexAll();
		}
		this.openRelatedNotesView();
		this.statusBar.clear();
	}

	onunload() {
		this.controller.unload();
		this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES).forEach((leaf) => leaf.detach());
		this.embeddingService.unload();
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
