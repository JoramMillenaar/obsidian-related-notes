import { Notice, Plugin } from "obsidian";
import { VIEW_TYPE_SIMILARITY } from "../ui/SimilarNotesListView";

export async function activateRightLeafView(plugin: Plugin): Promise<void> {
	const existing = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_SIMILARITY);
	if (existing.length) return;

	const leaf = plugin.app.workspace.getRightLeaf(false);
	if (!leaf) {
		new Notice("Unable to activate similarity view.");
		return;
	}

	await leaf.setViewState({
		type: VIEW_TYPE_SIMILARITY,
		active: false,
	});
}
