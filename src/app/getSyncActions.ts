import { IndexStorage, NoteSource } from "../types";
import { ReconciliationResult } from "../domain/setReconciliation";
import { deriveSyncActions } from "../domain/getSyncActions";


export type GetSyncActionsUseCase = () => Promise<ReconciliationResult<string>>;


export function makeGetSyncActions(deps: {
	noteSource: NoteSource;
	indexStorage: IndexStorage;
}): GetSyncActionsUseCase {
	return async function getSyncActions(): Promise<ReconciliationResult<string>> {
		const vaultNoteIds = deps.noteSource.listNoteIds();

		const index = await deps.indexStorage.getIndex();
		const indexedNoteIds = index.map(entry => entry.id);

		return deriveSyncActions(vaultNoteIds, indexedNoteIds);
	}
}

