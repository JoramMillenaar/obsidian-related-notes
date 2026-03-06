import { GetIndex, ListNoteIds } from "../types";
import { reconcileSets, ReconciliationResult } from "../domain/setReconciliation";

export async function getSyncActions(args: {
	listNoteIds: ListNoteIds;
	getIndex: GetIndex;
}): Promise<ReconciliationResult<string>> {
	const {listNoteIds, getIndex} = args;

	const vaultNoteIds = listNoteIds();

	const index = await getIndex();
	const indexedNoteIds = index.map(entry => entry.id);

	return reconcileSets(vaultNoteIds, indexedNoteIds);
}

