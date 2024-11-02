import { ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_RELATED_NOTES = 'related-notes';

export class ExampleView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}
	
	getViewType() {
		return VIEW_TYPE_RELATED_NOTES;
	}
	
	getDisplayText() {
		return 'Related Notes';
	}
	
	async onOpen() {
		const notes: Array<[number, string]> = [[0.99, "Testing this note"], [0.44, "Now another"], [0.23, "This one too"], [0.12, "The end :)"]]  // Fake notes for now

		const parent = this.containerEl.children[1];
		parent.empty();

		const container = parent.createEl('div', { cls: 'tag-container node-insert-event'});
		const list = container.createEl('div');
		notes.forEach(note => {
			const listItem = list.createEl('div', { cls: 'tree-item' });
			const itemSelf = listItem.createEl('div', { cls: 'tree-item-self tag-pane-tag is-clickable'});
			const itemInner = itemSelf.createEl('div', { cls: 'tree-item-inner' });
			const itemInnerText = itemInner.createEl('div', { cls: 'tree-item-inner-text' });
			itemInnerText.createEl('span', { cls: 'tree-item-inner-text', text: note[1] });

			const flairOuter = itemSelf.createEl('div', { cls: 'tree-item-flair-outer' });
			flairOuter.createEl('span', { cls: 'tag-pane-tag-count tree-item-flair', text: `${(note[0] * 100).toString()}%` });
		});
	}

	async onClose() {
		// Cleanup if necessary
	}
}
