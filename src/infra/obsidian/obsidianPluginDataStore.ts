import { Plugin } from "obsidian";
import { PerformanceMonitor, SimilarityPluginData } from "../../types";
import { normalizePluginData } from "../../domain/normalize";

export class ObsidianPluginDataStore {
	constructor(
		private readonly plugin: Plugin,
		private readonly performanceMonitor?: PerformanceMonitor,
	) {
	}

	async read(): Promise<SimilarityPluginData> {
		return await this.performanceMonitor?.measure(
			"infra.pluginData.read",
			async () => {
				const raw = await this.plugin.loadData() ?? {};
				return normalizePluginData(raw);
			},
		) ?? await (async () => {
			const raw = await this.plugin.loadData() ?? {};
			return normalizePluginData(raw);
		})();
	}

	async write(data: SimilarityPluginData): Promise<void> {
		await this.performanceMonitor?.measure(
			"infra.pluginData.write",
			() => this.plugin.saveData(data),
		) ?? await this.plugin.saveData(data);
	}

	async update(
		updater: (current: SimilarityPluginData) => SimilarityPluginData,
	): Promise<SimilarityPluginData> {
		return await this.performanceMonitor?.measure(
			"infra.pluginData.update",
			async () => {
				const current = await this.read();
				const next = updater(current);
				await this.write(next);
				return next;
			},
		) ?? await (async () => {
			const current = await this.read();
			const next = updater(current);
			await this.write(next);
			return next;
		})();
	}
}
