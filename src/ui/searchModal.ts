import { App, SuggestModal, TFile } from "obsidian";
import { RelatedNotesFacade } from "../facade";
import { KeyedDebouncer } from "../infra/debouncer";
import { RelatedNote } from "../types";

export class SearchModal extends SuggestModal<RelatedNote> {
	private facade: RelatedNotesFacade;
	private debouncer: KeyedDebouncer<string>;

	constructor(app: App, facade: RelatedNotesFacade) {
		super(app);
		this.facade = facade;
		this.debouncer = new KeyedDebouncer(300); // 300ms debounce delay
	}

	async getSuggestions(query: string): Promise<RelatedNote[]> {
		if (!query) {
			return [];
		}

		return new Promise((resolve) => {
			this.debouncer.schedule("search", async () => {
				try {
					const results = await this.facade.getSimilarNotes({
						text: query,
						limit: 10,
						minScore: 0.25,
					});
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
			this.app.workspace.getLeaf().openFile(file);
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
