import { App, ItemView, TFile, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_PROJECTIONS = "projections-view";

type MyGraphViewState = {
	mode: "global" | "note";
	filePath?: string;
};

export class ProjectionView extends ItemView {
	private viewStateData: MyGraphViewState = {mode: "global"};

	constructor(leaf: WorkspaceLeaf, public app: App) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_PROJECTIONS;
	}

	getDisplayText(): string {
		return this.viewStateData.mode === "note"
			? `Graph: ${this.viewStateData.filePath ?? "Unknown"}`
			: "Graph";
	}

	async setState(state: MyGraphViewState, result: unknown): Promise<void> {
		this.viewStateData = state ?? {mode: "global"};
		await this.render();
		// call super if needed depending on your setup
	}

	getState(): MyGraphViewState {
		return this.viewStateData;
	}

	async onOpen() {
		await this.render();
	}

	async render() {
		this.contentEl.empty();

		if (this.viewStateData.mode === "global") {
			this.contentEl.createEl("h2", {text: "Global graph"});
			return;
		}

		const filePath = this.viewStateData.filePath;
		if (!filePath) {
			this.contentEl.createEl("div", {text: "No file selected."});
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			this.contentEl.createEl("div", {text: "File not found."});
			return;
		}

		this.contentEl.createEl("h2", {text: `Graph for ${file.basename}`});
	}
}
