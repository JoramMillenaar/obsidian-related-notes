import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { AppController } from 'src/controller';

export const VIEW_TYPE_RELATED_NOTES = 'related-notes';

export class RelatedNotesListView extends ItemView {
	private controller: AppController;

	constructor(leaf: WorkspaceLeaf, controller: AppController) {
		super(leaf);
		this.controller = controller;
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

	async onOpen() {
		await this.render();
	}

	async render() {
		const parent = this.containerEl.children[1];
		parent.empty();

		const container = parent.createEl('div', { cls: 'tag-container node-insert-event' });
		const list = container.createEl('div');

		const notes = await this.controller.getActiveNoteRelations(5);

		notes.forEach(note => {
			const listItem = list.createEl('div', { cls: 'tree-item' });
			const itemSelf = listItem.createEl('div', { cls: 'tree-item-self tag-pane-tag is-clickable' });

			itemSelf.addEventListener("click", () => this.openNote(note.path));

			const itemInner = itemSelf.createEl('div', { cls: 'tree-item-inner' });
			const itemInnerText = itemInner.createEl('div', { cls: 'tree-item-inner-text' });
			itemInnerText.createEl('span', { cls: 'tree-item-inner-text', text: note.title });

			const flairOuter = itemSelf.createEl('div', { cls: 'tree-item-flair-outer' });
			flairOuter.createEl('span', { cls: 'tag-pane-tag-count tree-item-flair', text: `${(note.similarity * 100).toFixed(1)}%` });
		});
	}

	async refresh() {
		await this.render();
	}

	async onClose() {
		// Cleanup if necessary
	}
}
