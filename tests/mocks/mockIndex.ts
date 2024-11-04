import {IIndexService} from '../../src/services/indexService'

export class MockIndexService implements IIndexService {
    private initialized = false;

    async initializeIndex(): Promise<void> {
        console.log('Mock: initializeIndex called');
        this.initialized = true;
    }

    async isInitialized(): Promise<boolean> {
        console.log('Mock: isInitialized called');
        return this.initialized;
    }

    async insert(vector: Float32Array, text: string): Promise<void> {
        console.log(`Mock: insert called with vector: ${vector} and text: "${text}"`);
    }

    async search(vector: Float32Array, k: number): Promise<{ distance: number, text: string }[]> {
        console.log(`Mock: search called with vector: ${vector} and k: ${k}`);
        // Returning a mock result for testing purposes
        return [
            { distance: 0.1, text: "Example result 1" },
            { distance: 0.2, text: "Example result 2" }
        ];
    }

    async dropIndex(): Promise<void> {
        console.log('Mock: dropIndex called');
        this.initialized = false;
    }
}
