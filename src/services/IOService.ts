import { Plugin } from "obsidian";
import { IndexData } from "../vectra/types";

export interface IndexIO {
    initializeIndex(initialData: IndexData): Promise<void>;
    dropIndex(): Promise<void>;
    updateIndex(data: IndexData): Promise<void>;
    indexInitialized(): Promise<boolean>;
    retrieveIndex(): Promise<IndexData>;
}

export class ObsidianPluginFileIndexIO implements IndexIO {
    pluginFolderPath: string;
    filePath: string;

    constructor(private plugin: Plugin, filename = 'index') {
        this.pluginFolderPath = `.obsidian/plugins/related-notes/`;
        this.filePath = `${this.pluginFolderPath}${filename}.json`;
    }

    private async saveDataToFile(data: IndexData | null) {
        // TODO: cache in memory and save to filesystem after a delay
        if (!await this.plugin.app.vault.adapter.exists(this.pluginFolderPath)) {
            await this.plugin.app.vault.adapter.mkdir(this.pluginFolderPath);
        }

        await this.plugin.app.vault.adapter.write(this.filePath, JSON.stringify(data, null, 2));
    }

    private async loadDataFromFile(): Promise<any> {
        // TODO: keep this in memory so that we don't have to hit the filesystem every load.
        if (await this.plugin.app.vault.adapter.exists(this.filePath)) {
            const data = await this.plugin.app.vault.adapter.read(this.filePath);
            return JSON.parse(data);
        }
        return null;
    }

    async initializeIndex(initialData: IndexData): Promise<void> {
        const exists = await this.indexInitialized();
        if (!exists) {
            await this.saveDataToFile(initialData)
        }
    }

    async dropIndex(): Promise<void> {
        await this.saveDataToFile(null)
    }

    async updateIndex(data: IndexData): Promise<void> {
        await this.saveDataToFile(data)
    }

    async indexInitialized(): Promise<boolean> {
        const data = await this.loadDataFromFile();
        return data && data.items;
    }

    async retrieveIndex(): Promise<IndexData> {
        const data = await this.loadDataFromFile();
        if (!data) {
            throw new Error("Index does not exist.");
        }
        return data;
    }
}
