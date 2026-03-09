import { IndexRepository, NoteSource } from "../types";
import { ReconciliationResult } from "../domain/setReconciliation";
import { deriveSyncActions } from "../domain/getSyncActions";


export type GetSyncActionsUseCase = () => Promise<ReconciliationResult<string>>;


export function makeGetSyncActions(deps: {
	noteSource: NoteSource;
	indexRepo: IndexRepository;
}): GetSyncActionsUseCase {
	return async function getSyncActions(): Promise<ReconciliationResult<string>> {
		const vaultNoteIds = deps.noteSource.listIds();

		const index = await deps.indexRepo.listAll();
		const indexedNoteIds = index.map(entry => entry.id);

		return deriveSyncActions(vaultNoteIds, indexedNoteIds);
	}
}

