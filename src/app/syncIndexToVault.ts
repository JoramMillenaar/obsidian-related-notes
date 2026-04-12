import { GetSyncActionsUseCase } from "./getSyncActions";
import { ExecuteSyncActionsUseCase } from "./executeSyncActions";
import { yieldToUI } from "../domain/yieldToUI";
import { OnProgressCallback, PerformanceMonitor } from "../types";


export type SyncIndexToVaultUseCase = (args?: {
	batchSize?: number;
	onBatchComplete?: () => Promise<void>;
	onProgress?: OnProgressCallback;
}) => Promise<{
	indexed: number;
	deleted: number;
}>;

export function makeSyncIndexToVault(deps: {
	getSyncActions: GetSyncActionsUseCase,
	executeSyncActions: ExecuteSyncActionsUseCase,
	performanceMonitor: PerformanceMonitor,
}): SyncIndexToVaultUseCase {
	return async function syncIndexToVault(args = {}) {
		return await deps.performanceMonitor.measure(
			"usecase.syncIndexToVault",
			async () => {
				const {
					batchSize = 25,
					onBatchComplete = yieldToUI,
					onProgress,
				} = args;
				const actions = await deps.getSyncActions();
				return await deps.executeSyncActions({
					actions,
					batchSize,
					onBatchComplete,
					onProgress,
				});
			},
		);
	};
}
