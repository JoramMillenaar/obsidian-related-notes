import { IndexedNote } from "../../types";
import { IndexStorage } from "../../ports";
import { ObsidianPluginDataStore } from "./obsidianPluginDataStore";

export class ObsidianPluginDataIndexStorage implements IndexStorage {
	constructor(private readonly store: ObsidianPluginDataStore) {
	}

	async getAll(): Promise<IndexedNote[]> {
		const data = await this.store.read();
		return data.index;
	}

	async rewrite(index: IndexedNote[]): Promise<void> {
		await this.store.update((current) => ({
			...current,
			index,
		}));
	}

	async isEmpty(): Promise<boolean> {
		const data = await this.store.read();
		return data.index.length === 0;
	}
}
