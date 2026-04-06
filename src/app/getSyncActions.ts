import { IndexRepository, NoteSource } from "../types";
import { ReconciliationResult } from "../domain/setReconciliation";
import { deriveSyncActions } from "../domain/getSyncActions";


export type GetSyncActionsUseCase = () => Promise<ReconciliationResult<string>>;


export function makeGetSyncActions(deps: {
	noteSource: NoteSource;
	indexRepo: IndexRepository;
	isIgnoredPath?: (path: string) => boolean;
}): GetSyncActionsUseCase {
	return async function getSyncActions(): Promise<ReconciliationResult<string>> {
		const vaultNoteIds = deps.noteSource
			.listIds()
			.filter((id) => !deps.isIgnoredPath?.(id));

		const index = await deps.indexRepo.listAll();
		const indexedNoteIds = index.map(entry => entry.id);

		return deriveSyncActions(vaultNoteIds, indexedNoteIds);
	}
}

