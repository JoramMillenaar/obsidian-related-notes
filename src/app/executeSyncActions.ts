import { ReconciliationResult } from "../domain/setReconciliation";
import { yieldToUI } from "../domain/yieldToUI";
import { IndexRepository, OnProgressCallback, PerformanceMonitor, SyncResults } from "../types";
import { IndexNoteUseCase } from "./indexNote";


export type ExecuteSyncActionsUseCase = (args: {
	actions: ReconciliationResult<string>;
	batchSize?: number;
	onBatchComplete?: () => Promise<void>;
	onProgress?: OnProgressCallback;
}) => Promise<SyncResults>

export function makeExecuteSyncActions(deps: {
	indexNote: IndexNoteUseCase;
	indexRepo: IndexRepository;
	performanceMonitor: PerformanceMonitor;
}): ExecuteSyncActionsUseCase {
	return async function executeSyncActions(args) {
		return await deps.performanceMonitor.measure(
			"usecase.executeSyncActions",
			async () => {
				const {
					actions,
					batchSize = 25,
					onBatchComplete = yieldToUI,
					onProgress,
				} = args;
				const {toAdd, toRemove} = actions;

				// Phase 1: Delete removed notes
				let deleted = 0;
				for (const noteId of toRemove) {
					try {
						await deps.indexRepo.remove(noteId);
						deleted++;
					} catch (error) {
						console.error(`Failed to delete note ${noteId}:`, error);
					}

					onProgress?.({phase: "delete", processed: deleted, total: toRemove.length});

					if (deleted % batchSize === 0) {
						await onBatchComplete();
					}
				}

				// Phase 2: Index new notes
				let indexed = 0;
				for (const noteId of toAdd) {
					try {
						await deps.indexNote(noteId);
						indexed++;
					} catch (error) {
						console.error(`Failed to index note ${noteId}:`, error);
					}

					onProgress?.({phase: "index", processed: indexed, total: toAdd.length});

					if (indexed % batchSize === 0) {
						await onBatchComplete();
					}
				}

				return {
					indexed,
					deleted,
				};
			},
		);
	};
}
