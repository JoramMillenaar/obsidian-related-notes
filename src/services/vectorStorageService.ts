import { LocalIndex } from 'vectra';
import * as path from 'path';

export interface IVectorStorageService {
    insert(vector: Float32Array, text: string): Promise<void>; // Promise to handle async operations
    search(vector: Float32Array, k: number): Promise<{ distance: number, text: string }[]>;
    dropDb(): Promise<void>;
}

export class VectraService implements IVectorStorageService {
    private index: LocalIndex;

    constructor(indexDirectory: string) {
        this.index = new LocalIndex(path.join(indexDirectory));
        this.initializeIndex();
    }

    private async initializeIndex() {
        if (!await this.index.isIndexCreated()) {
            await this.index.createIndex();
        }
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
			text: result.item.metadata
        }));
    }

    async dropDb(): Promise<void> {
        await this.index.deleteIndex();
    }
}
