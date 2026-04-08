import { SimilarityPluginData, SimilaritySettings } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

export function normalizeSettings(
	value: Partial<SimilaritySettings> | undefined,
): SimilaritySettings {
	const ignored = value?.ignoredPaths;

	return {
		ignoredPaths: Array.isArray(ignored)
			? ignored
			: DEFAULT_SETTINGS.ignoredPaths,
	};
}

export function normalizePluginData(
	value: Partial<SimilarityPluginData>,
): SimilarityPluginData {
	return {
		settings: normalizeSettings(value?.settings),
		index: Array.isArray(value?.index) ? value.index : [],
	};
}
