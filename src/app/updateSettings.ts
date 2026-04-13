import { SettingsRepository, SimilaritySettings, SyncResults } from "../types";

export type UpdateSettingsUseCase = (
	patch: Partial<SimilaritySettings>,
) => Promise<SyncResults | undefined>;

export function makeUpdateSettings(deps: {
	settingsRepo: SettingsRepository;
	indexStorage: { isEmpty: () => Promise<boolean> };
	syncIndexToVault: () => Promise<SyncResults>;
}): UpdateSettingsUseCase {
	return async function updateSettings(patch) {
		await deps.settingsRepo.updatePartial(patch);
		if (await deps.indexStorage.isEmpty()) return;
		return await deps.syncIndexToVault();
	};
}
