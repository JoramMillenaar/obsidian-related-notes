import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { NoteService, RelatedNote } from '../services/noteService';

export const VIEW_TYPE_RELATED_NOTES = 'related-notes';

export class RelatedNotesListView extends ItemView {
	private noteService: NoteService;
	private notes: RelatedNote[] = [];

	constructor(leaf: WorkspaceLeaf, noteService: NoteService) {
		super(leaf);
		this.noteService = noteService;
	}

	getViewType() {
		return VIEW_TYPE_RELATED_NOTES;
	}

	getDisplayText() {
		return 'Related Notes';
	}

	private openNote = (path: string) => {
		new Notice('Opening notes not implemented yet');
		// const file = this.app.vault.getAbstractFileByPath(path);
		// if (file) {
		// 	this.app.workspace.getLeaf(true).openFile(file);
		// } else {
		// 	new Notice("Error: Note not found!");
		// }
	};

	private activeNotePath = () => {
		const current = this.app.workspace.getActiveFile();
		if (current && current.path) {
			return current.path;
		} else {
			new Notice('No active note!');
			return "";
		}
	};

	async onOpen() {
		const parent = this.containerEl.children[1];
		parent.empty();

		const container = parent.createEl('div', { cls: 'tag-container node-insert-event' });
		const list = container.createEl('div');
		
		const activePath = this.activeNotePath();
		if (activePath) {
			// TODO: get amount of notes to fetch from settings
			this.notes = await this.noteService.listRelatedNotes(activePath, 5);
		}

		this.notes.forEach(note => {
			const listItem = list.createEl('div', { cls: 'tree-item' });
			const itemSelf = listItem.createEl('div', { cls: 'tree-item-self tag-pane-tag is-clickable' });

			itemSelf.addEventListener("click", () => this.openNote(note.path));

			const itemInner = itemSelf.createEl('div', { cls: 'tree-item-inner' });
			const itemInnerText = itemInner.createEl('div', { cls: 'tree-item-inner-text' });
			itemInnerText.createEl('span', { cls: 'tree-item-inner-text', text: note.title });

			const flairOuter = itemSelf.createEl('div', { cls: 'tree-item-flair-outer' });
			flairOuter.createEl('span', { cls: 'tag-pane-tag-count tree-item-flair', text: `${(note.match * 100).toFixed(0)}%` });
		});
	}

	async onClose() {
		// Cleanup if necessary
	}
}
