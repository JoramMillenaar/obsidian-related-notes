import { reconcileSets } from "./setReconciliation";

export function deriveSyncActions(sourceIds: string[], targetIds: string[]) {
	const {toAdd, toRemove} = reconcileSets(sourceIds, targetIds);

	const duplicates = targetIds.filter((id, i) => targetIds.indexOf(id) !== i);
	for (const duplicate of duplicates) {
		toAdd.push(duplicate);
		toRemove.push(duplicate);
	}

	return {toAdd, toRemove}
}
