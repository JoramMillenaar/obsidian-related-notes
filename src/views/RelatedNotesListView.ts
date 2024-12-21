import { ItemView, WorkspaceLeaf, Notice, TFile, setIcon } from 'obsidian';
import { AppController } from 'src/controller';
import { logError } from 'src/services/utils';

export const VIEW_TYPE_RELATED_NOTES = 'related-notes';

export class RelatedNotesListView extends ItemView {
	private controller: AppController;
	private isLoading = false;

	constructor(leaf: WorkspaceLeaf, controller: AppController) {
		super(leaf);
		this.controller = controller;
	}

	getViewType() {
		return VIEW_TYPE_RELATED_NOTES;
	}

	getDisplayText() {
		return 'Similar Notes';
	}

	getIcon(): string {
		return 'telescope';
	}

	private openNote = (path: string) => {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf(false).openFile(file);
		} else {
			new Notice("Error: Note not found or invalid file type!");
		}
	};

	async onOpen() {
		await this.render();
	}

	async render() {
		// Clear the container and add a reusable header element
		this.containerEl.empty();

		// Create header with refresh button
		const header = this.containerEl.createEl('div', { cls: 'nav-header' });
		const navHeader = header.createEl('div', { cls: 'nav-buttons-container' });

		const refreshButton = navHeader.createEl('div', {
			cls: 'clickable-icon nav-action-button',
			attr: { 'aria-label': 'Refresh related notes' },
		});
		setIcon(refreshButton, 'refresh-ccw');

		refreshButton.addEventListener('click', async () => {
			if (!this.isLoading) {
				await this.refresh();
				this.isLoading = true;
				await this.controller.reindexCurrentActive();
				this.isLoading = false;
			}
		});

		// Main content container
		const contentContainer = this.containerEl.createEl('div', { cls: 'tag-container' });

		// Render the actual content
		await this.renderContent(contentContainer);
	}

	private async renderContent(contentContainer: HTMLElement) {
		contentContainer.empty(); // Clear the previous content

		// Show loading message
		const loadingMessage = contentContainer.createEl('div', {
			cls: 'tree-item-self',
			text: 'Loading similar notes...',
		});

		try {
			this.isLoading = true;
			await this.controller.ready();
			const notes = await this.controller.getActiveNoteRelations();
			this.isLoading = false;

			// Remove loading message after fetching notes
			loadingMessage.remove();

			if (notes.length === 0) {
				// Empty state for no related notes
				contentContainer.createEl('div', {
					cls: 'empty-message',
					text: 'No related notes found. Try refreshing.',
				});
				return;
			}

			// Create list of related notes
			const list = contentContainer.createEl('div');
			notes.forEach(note => {
				const listItem = list.createEl('div', { cls: 'tree-item' });
				const itemSelf = listItem.createEl('div', { cls: 'tree-item-self tag-pane-tag is-clickable' });

				itemSelf.addEventListener('click', () => this.openNote(note.path));

				const itemInner = itemSelf.createEl('div', { cls: 'tree-item-inner' });
				const itemInnerText = itemInner.createEl('div', { cls: 'tree-item-inner-text' });
				itemInnerText.createEl('span', { cls: 'tree-item-inner-text', text: note.title });

				const flairOuter = itemSelf.createEl('div', { cls: 'tree-item-flair-outer' });
				flairOuter.createEl('span', {
					cls: 'tag-pane-tag-count tree-item-flair',
					text: `${(note.similarity * 100).toFixed(0)}%`,
				});
			});
		} catch (error) {
			this.isLoading = false;
			loadingMessage.textContent = 'Failed to load related notes. Please try again.';
			logError('Error fetching related notes:', error);
		}
	}

	async refresh() {
		if (this.isLoading) return;

		const contentContainer = this.containerEl.querySelector('.tag-container') as HTMLElement;
		if (contentContainer) {
			await this.renderContent(contentContainer);
		}
	}

	async onClose() {
	}
}
