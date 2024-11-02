import { LocalIndex } from 'vectra';
import * as path from 'path';

export interface IIndexService {
    initializeIndex(): Promise<void>;
    insert(vector: Float32Array, text: string): Promise<void>;
    search(vector: Float32Array, k: number): Promise<{ distance: number, text: string }[]>;
    isInitialized(): Promise<boolean>;
    dropIndex(): Promise<void>;
}

export class VectraIndexService implements IIndexService {
    private index: LocalIndex;
    private indexPath: string;

    constructor(indexDirectory: string) {
        this.indexPath = path.join(indexDirectory);
        this.index = new LocalIndex(this.indexPath);
    }

    async initializeIndex(): Promise<void> {
        if (!await this.isInitialized()) {
            await this.index.createIndex();
			console.log('Index initialized')
        }
    }

    async isInitialized(): Promise<boolean> {
        return this.index.isIndexCreated();
    }

    async insert(vector: Float32Array, text: string): Promise<void> {
        await this.index.insertItem({
            vector: Array.from(vector),
            metadata: { text }
        });
    }

    async search(vector: Float32Array, k: number): Promise<{ distance: number, text: string }[]> {
        const results = await this.index.queryItems(Array.from(vector), k);
        return results.map(result => ({
            distance: result.score,
            text: result.item.metadata.text.toString()
        }));
    }

    async dropIndex(): Promise<void> {
        await this.index.deleteIndex();
    }
}
