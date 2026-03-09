import { IndexedNote, IndexStorage } from "../../types";
import { Plugin } from "obsidian";

export class ObsidianPluginDataIndexStorage implements IndexStorage {
	constructor(private readonly plugin: Plugin) {
	}

	async getAll() {
		const data = (await this.plugin.loadData()) ?? {};
		return Array.isArray(data.index) ? data.index : [];
	}

	async rewrite(index: IndexedNote[]) {
		const data = (await this.plugin.loadData()) ?? {};
		await this.plugin.saveData({...data, index});
	}

	async isEmpty() {
		const index = await this.getAll();
		return index.length === 0;
	}
}
