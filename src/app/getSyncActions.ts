import { IndexRepository, NoteSource, PerformanceMonitor, SettingsRepository } from "../types";
import { ReconciliationResult } from "../domain/setReconciliation";
import { deriveSyncActions } from "../domain/getSyncActions";
import { isPathIgnored } from "../domain/ignoreRules";

export type GetSyncActionsUseCase = () => Promise<ReconciliationResult<string>>;

export function makeGetSyncActions(deps: {
	noteSource: NoteSource;
	indexRepo: IndexRepository;
	settingsRepo: SettingsRepository;
	performanceMonitor: PerformanceMonitor;
}): GetSyncActionsUseCase {
	return async function getSyncActions(): Promise<ReconciliationResult<string>> {
		return await deps.performanceMonitor.measure(
			"usecase.getSyncActions",
			async () => {
				const noteIds = deps.noteSource.listIds();
				const settings = await deps.settingsRepo.get();

				const vaultNoteIds = noteIds.filter(
					(id) => !isPathIgnored(id, settings.ignoredPaths),
				);

				const index = await deps.indexRepo.listAll();
				const indexedNoteIds = index.map((entry) => entry.id);

				return deriveSyncActions(vaultNoteIds, indexedNoteIds);
			},
		);
	};
}
