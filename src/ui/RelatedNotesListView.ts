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

				const active = this.app.workspace.getActiveFile();
				if (active) {
					await this.facade.upsertNoteToIndex(active.path);
				}

			} catch (e) {
				logError("Error refreshing current note:", e);
				new Notice("Failed to refresh related notes.");
			} finally {
				this.isLoading = false;
				await this.refresh();
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
					text: "Oops, we're not ready yet.",
				});
				return;
			}

			const indexIsEmpty = await this.facade.isIndexEmpty();
			if (indexIsEmpty) {
				loadingMessage.remove();
				this.renderEmptyIndex(contentContainer);
				return;
			}

			const noteIsEmpty = await this.facade.isNoteEmpty(active.path);
			if (noteIsEmpty) {
				loadingMessage.remove();
				contentContainer.createEl("div", {
					cls: "empty-message",
					text: "The current note is empty. Add content to see related notes.",
				});
				return;
			}

			const noteText = await this.facade.getCleanNoteText(active.path);

			// Query related notes through facade.
			// This assumes your facade returns something like:
			// [{ id/path, score }] or you can map it.
			const related = await this.facade.getSimilarNotes({
				noteId: active.path,
				text: noteText,
				limit: 10, // or from settings
				minScore: 0.3,
			});

			loadingMessage.remove();

			if (related.length === 0) {
				contentContainer.createEl("div", {
					cls: "empty-message",
					text: "No related notes were similar enough to display yet.",
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

	private renderEmptyIndex(contentContainer: HTMLElement) {
		const emptyState = contentContainer.createEl("div", {cls: "empty-message related-notes-empty"});
		emptyState.createEl("div", {text: "Your related notes index is empty."});
		emptyState.createEl("div", {
			cls: "related-notes-warning",
			text: "Indexing may take a few minutes depending on your device and notes. Not advised on mobile.",
		});

		const actions = emptyState.createEl("div", {cls: "related-notes-actions"});

		const startButton = actions.createEl("button", {
			cls: "mod-cta related-notes-button",
			text: "Start indexing vault",
		});

		startButton.addEventListener("click", () => this.startIndexingVault(startButton, emptyState));
	}

	private async startIndexingVault(trigger?: HTMLButtonElement, emptyStateRoot?: HTMLElement) {
		if (this.isLoading) return;

		this.isLoading = true;
		trigger?.setAttribute("disabled", "true");

		// Guard against stale progress updates (e.g. rerender / multiple runs)
		const runId = Date.now();
		(this as any)._indexRunId = runId;

		const progressRoot = emptyStateRoot?.createEl("div", {cls: "related-notes-progress"});

		const progressText = progressRoot?.createEl("div", {
			cls: "related-notes-progress-text",
			text: "Preparing…",
		});

		const progressBar = progressRoot?.createEl("progress", {
			cls: "related-notes-progress-bar",
		}) as HTMLProgressElement | undefined;

		if (progressBar) {
			progressBar.max = 1;
			progressBar.value = 0;
		}

		// Throttle DOM updates so you don’t spam layout/paint
		let lastPaint = 0;

		const onProgress = (p: { phase: "scan" | "index" | "cleanup"; processed: number; total: number }) => {
			if ((this as any)._indexRunId !== runId) return;

			const now = Date.now();
			if (now - lastPaint < 100) return; // ~10fps
			lastPaint = now;

			const total = Math.max(0, p.total ?? 0);
			const processed = Math.max(0, p.processed ?? 0);
			const pct = total > 0 ? Math.min(1, processed / total) : 0;

			const phaseLabel =
				p.phase === "scan" ? "Scanning" :
					p.phase === "index" ? "Indexing" :
						"Cleaning up";

			if (progressText) {
				progressText.setText(
					`${phaseLabel}: ${processed}${total ? ` / ${total}` : ""} (${Math.round(pct * 100)}%)`
				);
			}

			if (progressBar) {
				progressBar.max = total || 1;
				progressBar.value = total ? processed : 0;
			}
		};

		try {
			await this.facade.syncVaultToIndex({
				batchSize: 25,
				deleteMissing: false,
				onProgress,
				onBatchComplete: async () => {
					// small yield helps UI remain responsive during big vaults
					await new Promise((r) => setTimeout(r, 0));
				},
			});

			if (progressText) progressText.setText("Done.");
			if (progressBar) {
				progressBar.max = 1;
				progressBar.value = 1;
			}

			new Notice("Indexing complete. Related notes will appear as they are processed.");
		} catch (error) {
			logError("Error syncing vault index:", error);
			if (progressText) progressText.setText("Failed.");
			new Notice("Failed to start indexing. See console for details.");
		} finally {
			trigger?.removeAttribute("disabled");
			this.isLoading = false;
			await this.refresh();
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
