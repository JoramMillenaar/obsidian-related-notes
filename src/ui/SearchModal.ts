import { App, SuggestModal, TFile } from "obsidian";
import { KeyedDebouncer } from "../domain/debouncer";
import { RelatedNote } from "../types";
import { GetSimilarNotesUseCase } from "../app/getSimilarNotes";

export type SearchModalDeps = {
	getSimilarNotes: GetSimilarNotesUseCase
}


export class SearchModal extends SuggestModal<RelatedNote> {
	private deps: SearchModalDeps;
	private debouncer: KeyedDebouncer<string>;

	constructor(app: App, deps: SearchModalDeps) {
		super(app);
		this.deps = deps;
		this.debouncer = new KeyedDebouncer(300); // 300ms debounce delay
	}

	async getSuggestions(query: string): Promise<RelatedNote[]> {
		if (!query) {
			return [];
		}

		return new Promise((resolve) => {
			this.debouncer.schedule("search", async () => {
				try {
					const results = await this.deps.getSimilarNotes({text: query});
					resolve(results);
				} catch (e) {
					console.error("[Related Notes Search] Failed to get related notes:", e);
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
