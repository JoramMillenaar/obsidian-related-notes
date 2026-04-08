import { SettingsRepository, SyncResults } from "../types";

export type UpdateIgnoredPathsUseCase = (
	ignoredPaths: string[],
) => Promise<SyncResults | undefined>;

export function makeUpdateIgnoredPaths(deps: {
	settingsRepo: SettingsRepository;
	indexStorage: { isEmpty: () => Promise<boolean> };
	syncIndexToVault: () => Promise<SyncResults>;
}): UpdateIgnoredPathsUseCase {
	return async function saveIgnoredPathsAndSync(
		ignoredPaths: string[],
	) {
		await deps.settingsRepo.updatePartial({ignoredPaths});
		if (await deps.indexStorage.isEmpty()) return;
		return await deps.syncIndexToVault();
	};
}
