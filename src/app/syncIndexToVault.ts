import { OnProgressCallback } from "../types";
import { StartOrRefreshIndexSyncUseCase, SubscribeIndexingStateUseCase, } from "./indexingCoordinator";


export type SyncIndexToVaultUseCase = (args?: {
	onProgress?: OnProgressCallback;
}) => Promise<{
	indexed: number;
	deleted: number;
}>;

export function makeSyncIndexToVault(deps: {
	startOrRefreshSync: StartOrRefreshIndexSyncUseCase;
	subscribe: SubscribeIndexingStateUseCase;
}): SyncIndexToVaultUseCase {
	return async function syncIndexToVault(args = {}) {
		const {onProgress} = args;
		const unsubscribe = onProgress
			? deps.subscribe((snapshot) => {
				if (snapshot.banner.kind === "hidden") {
					return;
				}

				onProgress({
					phase: snapshot.hasCompletedInitialIndex ? "index" : "scan",
					processed: snapshot.processed,
					total: snapshot.total,
				});
			})
			: () => {
			};

		try {
			return await deps.startOrRefreshSync({awaitCompletion: true});
		} finally {
			unsubscribe();
		}
	}
}
