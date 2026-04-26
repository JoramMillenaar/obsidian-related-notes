import { SettingsRepository } from "../ports";

export type IsInitialIndexCompletedUseCase = () => Promise<boolean>;
export type MarkInitialIndexCompletedUseCase = () => Promise<void>;

export function makeIsInitialIndexCompleted(deps: {
	settingsRepo: SettingsRepository;
}): IsInitialIndexCompletedUseCase {
	return async function isInitialIndexCompleted() {
		const settings = await deps.settingsRepo.get();
		return settings.initialIndexCompleted;
	};
}

export function makeMarkInitialIndexCompleted(deps: {
	settingsRepo: SettingsRepository;
}): MarkInitialIndexCompletedUseCase {
	return async function markInitialIndexCompleted() {
		await deps.settingsRepo.updatePartial({initialIndexCompleted: true});
	};
}
