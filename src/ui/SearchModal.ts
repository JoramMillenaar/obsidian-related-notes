import { App, Notice, Platform, SuggestModal, TFile } from "obsidian";
import { InsertWikilinkAtCursorUseCase } from "../app/insertWikilinkAtCursor";
import { KeyedDebouncer } from "../domain/debouncer";
import { IndexRepository, NoteSource, RelatedNote } from "../types";
import { GetSimilarNotesUseCase } from "../app/getSimilarNotes";

export type SearchModalDeps = {
	getSimilarNotes: GetSimilarNotesUseCase;
	insertWikilinkAtCursor: InsertWikilinkAtCursorUseCase;
	indexRepo: IndexRepository;
	noteSource: NoteSource;
	isIgnoredPath: (path: string) => Promise<boolean>;
	isInitialIndexCompleted: () => Promise<boolean>;
}


export class SearchModal extends SuggestModal<RelatedNote> {
	private deps: SearchModalDeps;
	private debouncer: KeyedDebouncer<string>;
	private chooseMode: "open" | "open-new-tab" | "open-right" | "insert-link" = "open";
	private static readonly DEFAULT_EMPTY_STATE = "Type to search related notes.";
	private static readonly LOADING_EMPTY_STATE = "Searching related notes...";
	private static readonly NO_RESULTS_EMPTY_STATE = "No related notes found.";
	private static readonly NEEDS_INITIAL_INDEX_STATE = "Run “Sync vault index” first to build your semantic index.";
	private static readonly EMPTY_INDEX_STATE = "Your index is empty. Run “Sync vault index” to rebuild it.";
	private static readonly IGNORED_NOTE_STATE = "The current note is ignored by settings.";
	private static readonly EMPTY_NOTE_STATE = "The current note is empty. Add content to see related notes.";
	private static readonly NO_ACTIVE_NOTE_STATE = "Open a note to see similar notes.";

	constructor(app: App, deps: SearchModalDeps) {
		super(app);
		this.deps = deps;
		this.debouncer = new KeyedDebouncer(300); // 300ms debounce delay
		this.emptyStateText = SearchModal.DEFAULT_EMPTY_STATE;
		this.setInstructions([
			{command: "↑↓", purpose: "navigate"},
			{command: "↵", purpose: "select"},
			{command: Platform.isMacOS ? "⌘ ↵" : "Ctrl ↵", purpose: "open in new tab"},
			{command: Platform.isMacOS ? "⌘ ⌥ ↵" : "Ctrl Alt ↵", purpose: "open to the right"},
			{command: Platform.isMacOS ? "⌘ ⇧ ↵" : "Ctrl Shift ↵", purpose: "insert wikilink"},
			{command: "esc", purpose: "close"},
		]);
		this.scope.register(["Mod"], "Enter", (evt) => {
			this.chooseMode = "open-new-tab";
			this.selectActiveSuggestion(evt);
			return false;
		});
		this.scope.register(["Mod", "Alt"], "Enter", (evt) => {
			this.chooseMode = "open-right";
			this.selectActiveSuggestion(evt);
			return false;
		});
		this.scope.register(["Mod", "Shift"], "Enter", (evt) => {
			this.chooseMode = "insert-link";
			this.selectActiveSuggestion(evt);
			return false;
		});
	}

	onOpen(): void {
		super.onOpen();
		window.setTimeout(() => this.inputEl.dispatchEvent(new Event("input")), 0);
	}

	async getSuggestions(query: string): Promise<RelatedNote[]> {
		if (!query) {
			return this.getInitialSuggestions();
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
		const chooseMode = this.chooseMode;
		this.chooseMode = "open";

		if (chooseMode === "insert-link" && evt instanceof KeyboardEvent) {
			void this.handleInsertLink(item);
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(item.id);
		if (file instanceof TFile) {
			if (chooseMode === "open-new-tab") {
				void this.app.workspace.getLeaf(true).openFile(file);
				return;
			}
			if (chooseMode === "open-right") {
				void this.app.workspace.getLeaf("split", "vertical").openFile(file);
				return;
			}
			void this.app.workspace.getLeaf(false).openFile(file);
		}
	}

	private async handleInsertLink(item: RelatedNote): Promise<void> {
		const result = await this.deps.insertWikilinkAtCursor(item.id);
		if (result === "inserted") {
			this.close();
			return;
		}

		new Notice("Could not insert link: no active editor.");
	}

	renderSuggestion(value: RelatedNote, el: HTMLElement): void {
		const file = this.app.vault.getAbstractFileByPath(value.id);
		let fileName = file?.name ?? value.id;
		if (fileName.endsWith('.md')) fileName = fileName.slice(0, -3);
		const scorePercent = (value.score * 100).toFixed(1);

		el.createEl("div", {text: fileName});
		el.createEl("small", {text: `${scorePercent}%`, cls: "suggestion-note"});
	}

	private async getInitialSuggestions(): Promise<RelatedNote[]> {
		const active = this.app.workspace.getActiveFile();
		if (!active) {
			this.emptyStateText = SearchModal.NO_ACTIVE_NOTE_STATE;
			return [];
		}

		this.emptyStateText = SearchModal.LOADING_EMPTY_STATE;
		this.onNoSuggestion();

		try {
			const [isInitialIndexCompleted, indexEmpty, isIgnored, noteEmpty] = await Promise.all([
				this.deps.isInitialIndexCompleted(),
				this.deps.indexRepo.isEmpty(),
				this.deps.isIgnoredPath(active.path),
				this.deps.noteSource.isEmpty(active.path),
			]);

			if (!isInitialIndexCompleted) {
				this.emptyStateText = SearchModal.NEEDS_INITIAL_INDEX_STATE;
				return [];
			}
			if (indexEmpty) {
				this.emptyStateText = SearchModal.EMPTY_INDEX_STATE;
				return [];
			}
			if (isIgnored) {
				this.emptyStateText = SearchModal.IGNORED_NOTE_STATE;
				return [];
			}
			if (noteEmpty) {
				this.emptyStateText = SearchModal.EMPTY_NOTE_STATE;
				return [];
			}

			const noteText = await this.deps.noteSource.getTextById(active.path);
			const results = await this.deps.getSimilarNotes({noteId: active.path, text: noteText});
			this.emptyStateText = results.length > 0
				? SearchModal.DEFAULT_EMPTY_STATE
				: SearchModal.NO_RESULTS_EMPTY_STATE;
			return results;
		} catch (e) {
			console.error("[Related Notes Search] Failed to get initial suggestions:", e);
			this.emptyStateText = SearchModal.NO_RESULTS_EMPTY_STATE;
			return [];
		}
	}

}
