import { ItemView, Notice, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import { RelatedNotesFacade } from "../facade";

export function logError(message: unknown, ...optionalParams: unknown[]) {
	console.error("[Semantic Notes]:", message, ...optionalParams);
}

export const VIEW_TYPE_SEMANTIC_NOTES = "semantic-notes";

type IndexProgress = {
	phase: "scan" | "index" | "cleanup";
	processed: number;
	total: number;
};

type SimilarNote = { id: string; score: number };

export class RelatedNotesListView extends ItemView {
	private isLoading = false;
	private indexRunId?: number;

	constructor(leaf: WorkspaceLeaf, private facade: RelatedNotesFacade) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_SEMANTIC_NOTES;
	}

	getDisplayText() {
		return "Similar notes";
	}

	getIcon(): string {
		return "telescope";
	}

	private openNote = (path: string) => {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice("Error: note not found or invalid file type.");
			return;
		}

		void this.app.workspace
			.getLeaf(false)
			.openFile(file)
			.catch((error) => {
				logError("Error opening note:", error);
				new Notice("Failed to open note.");
			});
	};

	async onOpen() {
		await this.render();
	}

	async render() {
		this.containerEl.empty();
		this.buildHeader(this.containerEl);
		const content = this.containerEl.createEl("div", {cls: "tag-container"});
		await this.renderContent(content);
	}

	private buildHeader(root: HTMLElement) {
		const header = root.createEl("div", {cls: "nav-header"});
		const navHeader = header.createEl("div", {cls: "nav-buttons-container"});

		const refreshButton = navHeader.createEl("div", {
			cls: "clickable-icon nav-action-button",
			attr: {"aria-label": "Refresh related notes"},
		});
		setIcon(refreshButton, "refresh-ccw");
		refreshButton.addEventListener("click", () => void this.handleRefresh());
	}

	private async handleRefresh() {
		if (this.isLoading) return;

		this.isLoading = true;
		try {
			const active = this.app.workspace.getActiveFile();
			if (active) await this.facade.upsertNoteToIndex(active.path);
		} catch (error) {
			logError("Error refreshing current note:", error);
			new Notice("Failed to refresh related notes.");
		} finally {
			this.isLoading = false;
			await this.refresh();
		}
	}

	private renderLoading(container: HTMLElement) {
		return container.createEl("div", {
			cls: "tree-item-self",
			text: "Loading similar notes...",
		});
	}

	private renderMessage(container: HTMLElement, text: string, extraCls?: string) {
		container.createEl("div", {
			cls: extraCls ? `empty-message ${extraCls}` : "empty-message",
			text,
		});
	}

	private async renderContent(container: HTMLElement) {
		container.empty();
		const loadingEl = this.renderLoading(container);

		this.isLoading = true;
		try {
			const active = await this.getActiveFileOrShowEmptyState(container, loadingEl);
			if (!active) return;

			const state = await this.getIndexAndNoteState(active.path);
			if (state.indexEmpty) {
				loadingEl.remove();
				this.renderEmptyIndex(container);
				return;
			}
			if (state.noteEmpty) {
				loadingEl.remove();
				this.renderMessage(container, "The current note is empty. Add content to see related notes.");
				return;
			}

			const related = await this.loadSimilarNotesForActiveFile(active.path);
			loadingEl.remove();

			if (related.length === 0) {
				this.renderMessage(container, "No related notes were similar enough to display yet.");
				return;
			}

			this.renderRelatedList(container, related);
		} catch (error) {
			logError("Error fetching related notes:", error);
			loadingEl.textContent = "Failed to load related notes. Please try again.";
		} finally {
			this.isLoading = false;
		}
	}

	private async getActiveFileOrShowEmptyState(container: HTMLElement, loadingEl: HTMLElement) {
		const active = this.app.workspace.getActiveFile();
		if (active) return active;

		loadingEl.remove();
		this.renderMessage(container, "Oops, we're not ready yet.");
		return null;
	}

	private async getIndexAndNoteState(notePath: string) {
		const [indexEmpty, noteEmpty] = await Promise.all([
			this.facade.isIndexEmpty(),
			this.facade.isNoteEmpty(notePath),
		]);
		return {indexEmpty, noteEmpty};
	}

	private async loadSimilarNotesForActiveFile(notePath: string): Promise<SimilarNote[]> {
		const noteText = await this.facade.getCleanNoteText(notePath);
		return this.facade.getSimilarNotes({
			noteId: notePath,
			text: noteText,
			limit: 10,
			minScore: 0.3,
		});
	}

	private renderRelatedList(container: HTMLElement, related: SimilarNote[]) {
		const list = container.createEl("div");

		related.forEach((note) => {
			const path = note.id;

			const listItem = list.createEl("div", {cls: "tree-item"});
			const itemSelf = listItem.createEl("div", {
				cls: "tree-item-self tag-pane-tag is-clickable",
			});
			itemSelf.addEventListener("click", () => this.openNote(path));

			const itemInner = itemSelf.createEl("div", {cls: "tree-item-inner"});
			const itemInnerText = itemInner.createEl("div", {cls: "tree-item-inner-text"});

			const title = path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
			itemInnerText.createEl("span", {cls: "tree-item-inner-text", text: title});

			const flairOuter = itemSelf.createEl("div", {cls: "tree-item-flair-outer"});
			flairOuter.createEl("span", {
				cls: "tag-pane-tag-count tree-item-flair",
				text: `${Math.round(note.score * 100)}%`,
			});
		});
	}

	private renderEmptyIndex(contentContainer: Element) {
		const emptyState = contentContainer.createEl("div", {cls: "empty-message related-notes-empty"});
		emptyState.createEl("div", {text: "Your semantic notes index is empty."});
		emptyState.createEl("div", {
			cls: "related-notes-warning",
			text: "Indexing may take a few minutes depending on your device and notes. Not advised on mobile.",
		});

		const actions = emptyState.createEl("div", {cls: "related-notes-actions"});
		const startButton = actions.createEl("button", {
			cls: "mod-cta related-notes-button",
			text: "Start indexing vault",
		});

		startButton.addEventListener("click", () => {
			void this.startIndexingVault(startButton, emptyState);
		});
	}

	private createIndexingProgressUI(root?: HTMLElement) {
		const progressRoot = root?.createEl("div", {cls: "related-notes-progress"});

		const progressText = progressRoot?.createEl("div", {
			cls: "related-notes-progress-text",
			text: "Preparing…",
		});

		const progressBar = progressRoot?.createEl("progress", {
			cls: "related-notes-progress-bar",
		});

		if (progressBar) {
			progressBar.max = 1;
			progressBar.value = 0;
		}

		return {progressText, progressBar};
	}

	private makeProgressHandler(runId: number, ui: ReturnType<typeof this.createIndexingProgressUI>) {
		let lastPaint = 0;

		return (p: IndexProgress) => {
			if (this.indexRunId !== runId) return;

			const now = Date.now();
			if (now - lastPaint < 100) return; // ~10fps
			lastPaint = now;

			const total = Math.max(0, p.total ?? 0);
			const processed = Math.max(0, p.processed ?? 0);
			const pct = total > 0 ? Math.min(1, processed / total) : 0;

			const phaseLabel =
				p.phase === "scan" ? "Scanning" : p.phase === "index" ? "Indexing" : "Cleaning up";

			ui.progressText?.setText(
				`${phaseLabel}: ${processed}${total ? ` / ${total}` : ""} (${Math.round(pct * 100)}%)`
			);

			if (ui.progressBar) {
				ui.progressBar.max = total || 1;
				ui.progressBar.value = total ? processed : 0;
			}
		};
	}

	private async startIndexingVault(trigger?: HTMLButtonElement, emptyStateRoot?: HTMLElement) {
		if (this.isLoading) return;

		this.isLoading = true;
		trigger?.setAttribute("disabled", "true");

		const runId = Date.now();
		this.indexRunId = runId;

		const ui = this.createIndexingProgressUI(emptyStateRoot);
		const onProgress = this.makeProgressHandler(runId, ui);

		try {
			await this.facade.syncVaultToIndex({
				batchSize: 25,
				deleteMissing: false,
				onProgress,
				onBatchComplete: async () => {
					await new Promise((r) => setTimeout(r, 0));
				},
			});

			ui.progressText?.setText("Done.");
			if (ui.progressBar) {
				ui.progressBar.max = 1;
				ui.progressBar.value = 1;
			}

			new Notice("Indexing complete. Related notes will appear as they are processed.");
		} catch (error) {
			logError("Error syncing vault index:", error);
			ui.progressText?.setText("Failed.");
			new Notice("Failed to start indexing. See console for details.");
		} finally {
			trigger?.removeAttribute("disabled");
			this.isLoading = false;
			await this.refresh();
		}
	}

	async refresh() {
		if (this.isLoading) return;
		const contentContainer = this.containerEl.querySelector(".tag-container");
		if (contentContainer) await this.renderContent(contentContainer as HTMLElement);
	}

	async onClose() {
	}
}
