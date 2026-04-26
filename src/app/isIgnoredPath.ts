import { SettingsRepository } from "../ports";
import { isPathIgnored } from "../domain/ignoreRules";

export type IsIgnoredPath = (path: string) => Promise<boolean>;

export function makeIsIgnoredPath(deps: {
	settingsRepo: SettingsRepository;
}): IsIgnoredPath {
	return async (path: string): Promise<boolean> => {
		const settings = await deps.settingsRepo.get();
		return isPathIgnored(path, settings.ignoredPaths);
	};
}
