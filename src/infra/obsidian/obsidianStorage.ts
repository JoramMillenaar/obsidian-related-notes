import { IndexedNote, IndexStorage } from "../../types";
import { Plugin } from "obsidian";

export class ObsidianPluginDataIndexStorage implements IndexStorage {
	constructor(private readonly plugin: Plugin) {
	}

	async getIndex() {
		const data = (await this.plugin.loadData()) ?? {};
		return Array.isArray(data.index) ? data.index : [];
	}

	async saveIndex(index: IndexedNote[]) {
		const data = (await this.plugin.loadData()) ?? {};
		await this.plugin.saveData({...data, index});
	}

	async isIndexEmpty() {
		const index = await this.getIndex();
		return index.length === 0;
	}
}
