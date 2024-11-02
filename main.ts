import { Plugin, Notice, WorkspaceLeaf } from 'obsidian';
import { NoteService } from './src/services/noteService';
import { OnnxEmbeddingService } from './src/services/embeddingService';
import { VectraIndexService } from './src/services/indexService';
import { MarkdownTextProcessingService } from './src/services/textProcessorService';
import { TokenBasedChunkingService } from './src/services/textChunkingService';
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from './src/views/RelatedNotesListView';

interface RelatedNotesSettings {
	numberOfRelatedNotes: number;
	indexDirectory: string;
}

export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;

	async onload() {
		const textProcessorService = new MarkdownTextProcessingService();
		const textChunkingService = new TokenBasedChunkingService();
		const embeddingService = new OnnxEmbeddingService();
		// TODO: Set defaults for settings and ensure the index directory exists/is created
		const indexService = new VectraIndexService('./.related_notes');
		// TODO: Maybe do this elsewhere and consider race conditions by not awaiting this
		indexService.initializeIndex();
		const noteService = new NoteService(textProcessorService, textChunkingService, embeddingService, indexService, this.app.vault)

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, noteService)
		);

		this.addRibbonIcon('list-ordered', 'Related Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'related-notes-reindex-all',
			name: 'Related Notes: Refresh relations of all notes',
			callback: () => {
				noteService.destroyAllNoteIndices();
				const paths: string[] = this.app.vault.getAllLoadedFiles().map(file => file.path);
				noteService.createManyNoteIndices(paths);
			}
		});
		this.addCommand({
			id: 'related-notes-reindex-note',
			name: 'Related Notes: Refresh current note\'s relations',
			callback: () => {
				const current = this.app.workspace.getActiveFile();
				if (current && current.path) { new Notice('Not Implemented yet!') } else { new Notice('No active note!') }
			}
		});
		this.addCommand({
			id: 'related-notes-show-related',
			name: 'Related Notes: Show Related Notes',
			callback: () => {this.activateView()}
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
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) { new Notice("Something went wrong"); return }
			await leaf.setViewState({ type: VIEW_TYPE_RELATED_NOTES, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}
