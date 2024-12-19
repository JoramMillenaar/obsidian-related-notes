import { Plugin } from "obsidian";
import { IndexData } from "../vectra/types";

export interface IndexIO {
    initializeIndex(initialData: IndexData): Promise<void>;
    dropIndex(): Promise<void>;
    updateIndex(data: IndexData): Promise<void>;
    indexExists(): Promise<boolean>;
    retrieveIndex(): Promise<IndexData>;
}


export class ObsidianIndexIO implements IndexIO {

    constructor(private plugin: Plugin, private initialData: IndexData = {version: 1, items: [], metadata_config: {}}) { }

    async initializeIndex(): Promise<void> {
        const exists = await this.indexExists();
        if (!exists) {
            await this.plugin.saveData(this.initialData)
        }
    }

    async dropIndex(): Promise<void> {
        await this.plugin.saveData(this.initialData)
    }

    async updateIndex(data: IndexData): Promise<void> {
        await this.plugin.saveData(data)
    }

    async indexExists(): Promise<boolean> {
        const data = await this.plugin.loadData();
        return data !== null;
    }

    async retrieveIndex(): Promise<IndexData> {
        const data = await this.plugin.loadData();
        if (!data) {
            throw new Error("Index does not exist.");
        }
        return data;
    }
}
