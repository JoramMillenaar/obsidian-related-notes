import { ReconciliationResult } from "../domain/setReconciliation";
import { yieldToUI } from "../domain/yieldToUI";
import { IndexRepository, OnProgressCallback, PerformanceMonitor, SyncResults } from "../types";
import { IndexNoteUseCase } from "./indexNote";

function now(): number {
	return globalThis.performance?.now?.() ?? Date.now();
}


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
				const runStartedAt = now();
				let lastYieldEndedAt = runStartedAt;
				let longestBlockMs = 0;
				let longestYieldGapMs = 0;
				let yieldCount = 0;
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
						const blockingWindowMs = now() - lastYieldEndedAt;
						longestBlockMs = Math.max(longestBlockMs, blockingWindowMs);
						await onBatchComplete();
						const yieldEndedAt = now();
						longestYieldGapMs = Math.max(longestYieldGapMs, yieldEndedAt - lastYieldEndedAt);
						lastYieldEndedAt = yieldEndedAt;
						yieldCount++;
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
						const blockingWindowMs = now() - lastYieldEndedAt;
						longestBlockMs = Math.max(longestBlockMs, blockingWindowMs);
						await onBatchComplete();
						const yieldEndedAt = now();
						longestYieldGapMs = Math.max(longestYieldGapMs, yieldEndedAt - lastYieldEndedAt);
						lastYieldEndedAt = yieldEndedAt;
						yieldCount++;
					}
				}

				const remainingBlockMs = now() - lastYieldEndedAt;
				longestBlockMs = Math.max(longestBlockMs, remainingBlockMs);
				const durationMs = now() - runStartedAt;
				const notesProcessed = indexed + deleted;
				deps.performanceMonitor.recordSchedulerSample({
					notesProcessed,
					durationMs,
					notesPerSecond: durationMs > 0 ? notesProcessed / (durationMs / 1000) : 0,
					yieldCount,
					longestBlockMs,
					longestYieldGapMs,
				});

				return {
					indexed,
					deleted,
				};
			},
		);
	};
}
