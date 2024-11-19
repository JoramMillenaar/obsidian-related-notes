import { Plugin, FileSystemAdapter, Notice } from 'obsidian';
import { NoteService } from './src/services/noteService';
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from './src/views/RelatedNotesListView';
import { AppController } from './src/controller';
import { EmbeddingService } from './src/services/embeddingService';
import { MarkdownTextProcessingService } from './src/services/textProcessorService';
import { ServerProcessSupervisor } from './src/server'
import axios from 'axios';
import path from 'path';

interface RelatedNotesSettings {
	numberOfRelatedNotes: number;
	indexDirectory: string;
}

export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;
	private serverSupervisor: ServerProcessSupervisor | null = null;
	private controller: AppController;

	async onload() {
		const port = 3000;
		this.serverSupervisor = await this.startServer(port);
		const axiosInstance = axios.create({
			baseURL: 'http://localhost:' + port,
			headers: { 'Content-Type': 'application/json' }
		});
		const textProcessor = new MarkdownTextProcessingService();
		const embeddingService = new EmbeddingService(axiosInstance);
		const noteService = new NoteService(this.app);
		this.controller = new AppController(noteService, embeddingService, textProcessor);

		this.controller.reindexAll();

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, this.controller)
		);

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
		if (this.serverSupervisor) {
			this.serverSupervisor.terminateServer();
		}

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

	private async startServer(port=3000) {
		const supervisor = new ServerProcessSupervisor();

		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			const vaultDir = this.app.vault.adapter.getBasePath();
			const pluginDir = path.join(vaultDir, '.obsidian', 'plugins', 'related-notes');
			supervisor.startServer(pluginDir, port);
			return supervisor;
		}
		throw new Error('Mobile environment not supported');
	}
}
