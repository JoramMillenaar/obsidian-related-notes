import { SimilaritySettings } from "../../types";
import { SettingsRepository } from "../../ports";
import { ObsidianPluginDataStore } from "./obsidianPluginDataStore";

export class ObsidianSettingsRepository implements SettingsRepository {
	constructor(private readonly store: ObsidianPluginDataStore) {
	}

	async get(): Promise<SimilaritySettings> {
		return (await this.store.read()).settings;
	}

	async update(settings: SimilaritySettings): Promise<void> {
		return this.writeSettings(() => settings);
	}

	async updatePartial(patch: Partial<SimilaritySettings>): Promise<void> {
		return this.writeSettings((current) => ({
			...current,
			...patch,
		}));
	}

	private async writeSettings(
		update: (current: SimilaritySettings) => SimilaritySettings,
	): Promise<void> {
		await this.store.update((current) => ({
			...current,
			settings: update(current.settings),
		}));
	}
}
