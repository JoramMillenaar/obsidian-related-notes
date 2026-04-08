import { App, SuggestModal, TFile } from "obsidian";
import { KeyedDebouncer } from "../domain/debouncer";
import { IndexRepository, RelatedNote } from "../types";
import { GetSimilarNotesUseCase } from "../app/getSimilarNotes";

export type SearchModalDeps = {
	getSimilarNotes: GetSimilarNotesUseCase;
	indexRepo: IndexRepository;
	isInitialIndexCompleted: () => Promise<boolean>;
}


export class SearchModal extends SuggestModal<RelatedNote> {
	private deps: SearchModalDeps;
	private debouncer: KeyedDebouncer<string>;
	private static readonly DEFAULT_EMPTY_STATE = "Type to search related notes.";
	private static readonly LOADING_EMPTY_STATE = "Searching related notes...";
	private static readonly NO_RESULTS_EMPTY_STATE = "No related notes found.";
	private static readonly NEEDS_INITIAL_INDEX_STATE = "Run “Sync vault index” first to build your semantic index.";
	private static readonly EMPTY_INDEX_STATE = "Your index is empty. Run “Sync vault index” to rebuild it.";

	constructor(app: App, deps: SearchModalDeps) {
		super(app);
		this.deps = deps;
		this.debouncer = new KeyedDebouncer(300); // 300ms debounce delay
		this.emptyStateText = SearchModal.DEFAULT_EMPTY_STATE;
	}

	async getSuggestions(query: string): Promise<RelatedNote[]> {
		if (!query) {
			this.emptyStateText = SearchModal.DEFAULT_EMPTY_STATE;
			return [];
		}

		this.emptyStateText = SearchModal.LOADING_EMPTY_STATE;
		this.onNoSuggestion();

		return new Promise((resolve) => {
			this.debouncer.schedule("search", async () => {
				try {
					const [isInitialIndexCompleted, indexEmpty] = await Promise.all([
						this.deps.isInitialIndexCompleted(),
						this.deps.indexRepo.isEmpty(),
					]);
					if (!isInitialIndexCompleted) {
						this.emptyStateText = SearchModal.NEEDS_INITIAL_INDEX_STATE;
						resolve([]);
						return;
					}
					if (indexEmpty) {
						this.emptyStateText = SearchModal.EMPTY_INDEX_STATE;
						resolve([]);
						return;
					}

					const results = await this.deps.getSimilarNotes({text: query});
					this.emptyStateText = results.length > 0
						? SearchModal.DEFAULT_EMPTY_STATE
						: SearchModal.NO_RESULTS_EMPTY_STATE;
					resolve(results);
				} catch (e) {
					console.error("[Related Notes Search] Failed to get related notes:", e);
					this.emptyStateText = SearchModal.NO_RESULTS_EMPTY_STATE;
					resolve([]);
				}
			});
		});
	}

	onChooseSuggestion(item: RelatedNote, evt: MouseEvent | KeyboardEvent): void {
		const file = this.app.vault.getAbstractFileByPath(item.id);
		if (file instanceof TFile) {
			void this.app.workspace.getLeaf().openFile(file);
		}
	}

	renderSuggestion(value: RelatedNote, el: HTMLElement): void {
		const file = this.app.vault.getAbstractFileByPath(value.id);
		let fileName = file?.name ?? value.id;
		if (fileName.endsWith('.md')) fileName = fileName.slice(0, -3);
		const scorePercent = (value.score * 100).toFixed(1);

		el.createEl("div", {text: fileName});
		el.createEl("small", {text: `${scorePercent}%`, cls: "suggestion-note"});
	}
}
