import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_PROJECTIONS = "projections-view";

export class ProjectionView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_PROJECTIONS;
	}

	getDisplayText() {
		return "Similarity Projections";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		// content here
	}

	async onClose() {
		// cleanup
	}
}
