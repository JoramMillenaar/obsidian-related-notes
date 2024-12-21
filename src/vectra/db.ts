// Based on the original code from vectra (https://github.com/Stevenic/vectra).

import { v4 } from 'uuid';
import { IndexData, IndexItem, IndexStats, MetadataFilter } from './types';
import { ItemSelector } from './item';
import { IndexIO } from 'src/services/indexService';


export interface CreateIndexConfig {
    version: number;
    deleteIfExists?: boolean;
    metadata_config?: {
        indexed?: string[];
    };
}

export class LocalIndex {
    private backend: IndexIO;

    private _data?: IndexData;
    private _update?: IndexData;

    public constructor(backend: IndexIO) {
        this.backend = backend;
    }

    public async beginUpdate(): Promise<void> {
        if (this._update) {
            throw new Error('Update already in progress');
        }

        await this.loadIndexData();
        this._update = Object.assign({}, this._data);
    }

    public cancelUpdate(): void {
        this._update = undefined;
    }

    public async createIndex(config: CreateIndexConfig = { version: 1 }): Promise<void> {
        if (await this.isIndexCreated()) {
            if (config.deleteIfExists) {
                await this.deleteIndex();
            } else {
                throw new Error('Index already exists');
            }
        }

        try {
            this._data = {
                version: config.version,
                metadata_config: config.metadata_config ?? {},
                items: []
            };

            this.backend.initializeIndex(this._data);
        } catch (err: unknown) {
            await this.deleteIndex();
            throw new Error('Error creating index');
        }
    }

    public deleteIndex(): Promise<void> {
        this._data = undefined;
        return this.backend.dropIndex();
    }

    public async deleteItem(id: string): Promise<void> {
        if (this._update) {
            const index = this._update.items.findIndex(i => i.id === id);
            if (index >= 0) {
                this._update.items.splice(index, 1);
            }
        } else {
            await this.beginUpdate();
            const index = this._update!.items.findIndex(i => i.id === id);
            if (index >= 0) {
                this._update!.items.splice(index, 1);
            }
            await this.endUpdate();
        }
    }

    public async endUpdate(): Promise<void> {
        if (!this._update) {
            throw new Error('No update in progress');
        }

        try {
            // Save index
            this.backend.updateIndex(this._update);
            this._data = this._update;
            this._update = undefined;
        } catch (err: unknown) {
            throw new Error(`Error saving index: ${(err as any).toString()}`);
        }
    }

    public async getIndexStats(): Promise<IndexStats> {
        await this.loadIndexData();
        return {
            version: this._data!.version,
            metadata_config: this._data!.metadata_config,
            items: this._data!.items.length
        };
    }

    public async getItem(id: string) {
        await this.loadIndexData();
        return this._data!.items.find(i => i.id === id) as any | undefined;
    }

    public async insertItem(item: any) {
        if (this._update) {
            return await this.addItemToUpdate(item, true) as any;
        } else {
            await this.beginUpdate();
            const newItem = await this.addItemToUpdate(item, true);
            await this.endUpdate();
            return newItem as any;
        }
    }

    public async isIndexCreated(): Promise<boolean> {
        return await this.backend.indexInitialized();
    }

    public async listItems() {
        await this.loadIndexData();
        return this._data!.items.slice() as any;
    }

    public async listItemsByMetadata(filter: MetadataFilter) {
        await this.loadIndexData();
        return this._data!.items.filter(i => ItemSelector.select(i.metadata, filter)) as any;
    }

    public async queryItems(vector: number[], topK: number, filter?: MetadataFilter) {
        await this.loadIndexData();

        // Filter items
        let items = this._data!.items;
        if (filter) {
            items = items.filter(i => ItemSelector.select(i.metadata, filter));
        }

        // Calculate distances
        const norm = ItemSelector.normalize(vector);
        const distances: { index: number, distance: number }[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const distance = ItemSelector.normalizedCosineSimilarity(vector, norm, item.vector, item.norm);
            distances.push({ index: i, distance: distance });
        }

        // Sort by distance DESCENDING
        distances.sort((a, b) => b.distance - a.distance);

        // Find top k
        return distances.slice(0, topK).map(d => {
            return {
                item: Object.assign({}, items[d.index]) as any,
                score: d.distance
            };
        });
    }

    public async upsertItem(item: any) {
        if (this._update) {
            return await this.addItemToUpdate(item, false) as any;
        } else {
            await this.beginUpdate();
            const newItem = await this.addItemToUpdate(item, false);
            await this.endUpdate();
            return newItem as any;
        }
    }

    protected async loadIndexData(): Promise<void> {
        if (this._data) {
            return;
        }

        if (!await this.isIndexCreated()) {
            throw new Error('Index does not exist');
        }

        this._data = await this.backend.retrieveIndex();
    }

    private async addItemToUpdate(item: Partial<IndexItem<any>>, unique: boolean): Promise<IndexItem> {
        // Ensure vector is provided
        if (!item.vector) {
            throw new Error('Vector is required');
        }

        // Ensure unique
        const id = item.id ?? v4();
        if (unique) {
            const existing = this._update!.items.find(i => i.id === id);
            if (existing) {
                throw new Error(`Item with id ${id} already exists`);
            }
        }

        // Check for indexed metadata
        let metadata: Record<string, any> = {};
        if (item.metadata) {
            metadata = item.metadata;
        }

        // Create new item
        const newItem: IndexItem = {
            id: id,
            metadata: metadata,
            vector: item.vector,
            norm: ItemSelector.normalize(item.vector)
        };

        // Add item to index
        if (!unique) {
            const existing = this._update!.items.find(i => i.id === id);
            if (existing) {
                existing.metadata = newItem.metadata;
                existing.vector = newItem.vector;
                existing.metadataFile = newItem.metadataFile;
                return existing;
            } else {
                this._update!.items.push(newItem);
                return newItem;
            }
        } else {
            this._update!.items.push(newItem);
            return newItem;
        }
    }
}

