import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Note, listRelatedNotes } from '../services/noteService';

export const VIEW_TYPE_RELATED_NOTES = 'related-notes';

export class RelatedNotesListView extends ItemView {
    private notes: Note[];

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_RELATED_NOTES;
    }

    getDisplayText() {
        return 'Related Notes';
    }

    private openNote = (path: string) => {
		// Separate this logic. Error handling needs to happen (what if we can't find the note?)
		//   Also, this don't work
        console.log('Opening Notes not implemented yet. ', path);
    }

    async onOpen() {
        const parent = this.containerEl.children[1];
        parent.empty();

        const notes = await listRelatedNotes("", 4);
        const container = parent.createEl('div', { cls: 'tag-container node-insert-event' });
        const list = container.createEl('div');

        notes.forEach(note => {
            const listItem = list.createEl('div', { cls: 'tree-item' });
            const itemSelf = listItem.createEl('div', { cls: 'tree-item-self tag-pane-tag is-clickable' });

            itemSelf.addEventListener("click", () => this.openNote(note.path));

            const itemInner = itemSelf.createEl('div', { cls: 'tree-item-inner' });
            const itemInnerText = itemInner.createEl('div', { cls: 'tree-item-inner-text' });
            itemInnerText.createEl('span', { cls: 'tree-item-inner-text', text: note.title });

            const flairOuter = itemSelf.createEl('div', { cls: 'tree-item-flair-outer' });
            flairOuter.createEl('span', { cls: 'tag-pane-tag-count tree-item-flair', text: `${(note.match * 100).toFixed(2)}%` });
        });
    }

    async onClose() {
        // Cleanup if necessary
    }
}
