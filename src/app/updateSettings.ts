import { SimilaritySettings } from "../types";
import { SettingsRepository } from "../ports";
import { StartOrRefreshIndexSyncUseCase } from "./indexingCoordinator";

export type UpdateSettingsResult = {
	reindexQueued: boolean;
};

export type UpdateSettingsUseCase = (
	patch: Partial<SimilaritySettings>,
) => Promise<UpdateSettingsResult>;

export function makeUpdateSettings(deps: {
	settingsRepo: SettingsRepository;
	indexStorage: { isEmpty: () => Promise<boolean> };
	startOrRefreshIndexSync: StartOrRefreshIndexSyncUseCase;
}): UpdateSettingsUseCase {
	return async function updateSettings(patch) {
		await deps.settingsRepo.updatePartial(patch);
		if (await deps.indexStorage.isEmpty()) {
			return {reindexQueued: false};
		}

		await deps.startOrRefreshIndexSync({
			awaitCompletion: false,
			forceReindexAll: true,
		});
		return {reindexQueued: true};
	};
}
