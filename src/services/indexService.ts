import { Plugin } from "obsidian";
import { IndexData } from "../vectra/types";

export interface IndexIO {
    initializeIndex(initialData: IndexData): Promise<void>;
    dropIndex(): Promise<void>;
    updateIndex(data: IndexData): Promise<void>;
    indexInitialized(): Promise<boolean>;
    retrieveIndex(): Promise<IndexData>;
}


export class ObsidianIndexIO implements IndexIO {

    constructor(private plugin: Plugin) { }

    async initializeIndex(initialData: IndexData): Promise<void> {
        const exists = await this.indexInitialized();
        if (!exists) {
            await this.plugin.saveData(initialData)
        }
    }

    async dropIndex(): Promise<void> {
        await this.plugin.saveData(null)
    }

    async updateIndex(data: IndexData): Promise<void> {
        await this.plugin.saveData(data)
    }

    async indexInitialized(): Promise<boolean> {
        const data = await this.plugin.loadData();
        return data && data.items;
    }

    async retrieveIndex(): Promise<IndexData> {
        const data = await this.plugin.loadData();
        if (!data) {
            throw new Error("Index does not exist.");
        }
        return data;
    }
}
