import { IEmbeddingService } from '../../src/services/embeddingService';

export class MockEmbeddingService implements IEmbeddingService {
    async generateEmbedding(text: string): Promise<Float32Array> {
        console.log(`Mock: generateEmbedding called with text: "${text}"`);
        // Return a mock Float32Array for testing purposes
        return new Float32Array(128).fill(0.5); // Assuming embedding size is 128
    }
}
