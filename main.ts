import { Plugin, Notice, WorkspaceLeaf } from 'obsidian';
import { NoteService } from './src/services/noteService';
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from './src/views/RelatedNotesListView';
import { AppController } from './src/controller';
import { EmbeddingService } from './src/services/embeddingService';
import { MarkdownTextProcessingService } from './src/services/textProcessorService';
import axios from 'axios';

interface RelatedNotesSettings {
	numberOfRelatedNotes: number;
	indexDirectory: string;
}

export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;

	async onload() {
		const axiosInstance = axios.create({
			baseURL: 'http://localhost:3000',
			headers: {'Content-Type': 'application/json'}
		});
		const textProcessor = new MarkdownTextProcessingService();
		const embeddingService = new EmbeddingService(axiosInstance);
		const noteService = new NoteService(this.app);
		const controller = new AppController(noteService, embeddingService, textProcessor);

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, controller)
		);

		this.addRibbonIcon('list-ordered', 'Related Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'related-notes-reindex-all',
			name: 'Related Notes: Refresh relations of all notes',
			callback: () => {
				controller.reindexAll();
			}
		});
		this.addCommand({
			id: 'related-notes-reindex-note',
			name: 'Related Notes: Refresh current note\'s relations',
			callback: () => {
				controller.reindexCurrentActive();
			}
		});
		this.addCommand({
			id: 'related-notes-show-related',
			name: 'Related Notes: Show Related Notes',
			callback: () => { this.activateView() }
		});
	}

	onunload() {
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES);

		if (leaves.length > 0) {
			leaf = leaves[0];
			// @ts-ignore
			leaf.view.render();
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) { new Notice("Something went wrong"); return }
			await leaf.setViewState({ type: VIEW_TYPE_RELATED_NOTES, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}
