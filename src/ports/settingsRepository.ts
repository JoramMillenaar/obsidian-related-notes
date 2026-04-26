import { SimilaritySettings } from "../types";

export interface SettingsRepository {
	get(): Promise<SimilaritySettings>;

	update(settings: SimilaritySettings): Promise<void>;

	updatePartial(patch: Partial<SimilaritySettings>): Promise<void>;
}
