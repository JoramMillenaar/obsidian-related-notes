import { ItemView, Notice, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import { RelatedNotesFacade } from "../facade";

export function logError(message: any, ...optionalParams: any[]) {
	console.error('[Related Notes]:', message, ...optionalParams);
}

export const VIEW_TYPE_RELATED_NOTES = "related-notes";

export class RelatedNotesListView extends ItemView {
	private isLoading = false;

	constructor(
		leaf: WorkspaceLeaf,
		private facade: RelatedNotesFacade
	) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_RELATED_NOTES;
	}

	getDisplayText() {
		return "Similar Notes";
	}

	getIcon(): string {
		return "telescope";
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
		this.containerEl.empty();

		// Header
		const header = this.containerEl.createEl("div", {cls: "nav-header"});
		const navHeader = header.createEl("div", {cls: "nav-buttons-container"});

		const refreshButton = navHeader.createEl("div", {
			cls: "clickable-icon nav-action-button",
			attr: {"aria-label": "Refresh related notes"},
		});
		setIcon(refreshButton, "refresh-ccw");

		refreshButton.addEventListener("click", async () => {
			if (this.isLoading) return;

			try {
				this.isLoading = true;

				// Reindex current note first, then refresh UI
				const active = this.app.workspace.getActiveFile();
				if (active) {
					// Prefer queue-based indexing if you have it
					await this.facade.upsertNoteToIndex(active.path);
				}

				await this.refresh();
			} catch (e) {
				logError("Error refreshing current note:", e);
				new Notice("Failed to refresh related notes.");
			} finally {
				this.isLoading = false;
			}
		});

		// Main content container
		const contentContainer = this.containerEl.createEl("div", {cls: "tag-container"});

		await this.renderContent(contentContainer);
	}

	private async renderContent(contentContainer: HTMLElement) {
		contentContainer.empty();

		const loadingMessage = contentContainer.createEl("div", {
			cls: "tree-item-self",
			text: "Loading similar notes...",
		});

		try {
			this.isLoading = true;

			const active = this.app.workspace.getActiveFile();
			if (!active) {
				loadingMessage.remove();
				contentContainer.createEl("div", {
					cls: "empty-message",
					text: "Open a note to see related notes.",
				});
				return;
			}

			// Query related notes through facade.
			// This assumes your facade returns something like:
			// [{ id/path, score }] or you can map it.
			const related = await this.facade.getSimilarNotes({
				noteId: active.path,
				limit: 10, // or from settings
				minScore: 0.3,
			});

			loadingMessage.remove();

			if (related.length === 0) {
				contentContainer.createEl("div", {
					cls: "empty-message",
					text: "No related notes found. Try refreshing.",
				});
				return;
			}

			const list = contentContainer.createEl("div");
			related.forEach((note) => {
				const path = note.id;

				const listItem = list.createEl("div", {cls: "tree-item"});
				const itemSelf = listItem.createEl("div", {cls: "tree-item-self tag-pane-tag is-clickable"});

				itemSelf.addEventListener("click", () => this.openNote(path));

				const itemInner = itemSelf.createEl("div", {cls: "tree-item-inner"});
				const itemInnerText = itemInner.createEl("div", {cls: "tree-item-inner-text"});

				// Title: either store title in index, or derive from path
				const title = path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
				itemInnerText.createEl("span", {cls: "tree-item-inner-text", text: title});

				const flairOuter = itemSelf.createEl("div", {cls: "tree-item-flair-outer"});
				flairOuter.createEl("span", {
					cls: "tag-pane-tag-count tree-item-flair",
					text: `${Math.round(note.score * 100)}%`,
				});
			});
		} catch (error) {
			loadingMessage.textContent = "Failed to load related notes. Please try again.";
			logError("Error fetching related notes:", error);
		} finally {
			this.isLoading = false;
		}
	}

	async refresh() {
		if (this.isLoading) return;

		const contentContainer = this.containerEl.querySelector(".tag-container") as HTMLElement | null;
		if (contentContainer) {
			await this.renderContent(contentContainer);
		}
	}

	async onClose() {
	}
}
