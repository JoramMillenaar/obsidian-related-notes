
import { pipeline } from '@xenova/transformers';

export interface IEmbeddingService {
	generateEmbedding(text: string): Promise<Float32Array>;
}

/**
 * Simple but quality text embedder. Might replace with a custom implementation to absolutely ensure privacy
 */
export class XenovaEmbeddingService implements IEmbeddingService {
	private embedder: any;

	constructor() {
		this.initializeModel();
	}

	private async initializeModel() {
		this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
	}

	async generateEmbedding(text: string): Promise<Float32Array> {
		if (!this.embedder) {
			await this.initializeModel();
		}
		const embeddings = await this.embedder(text);
		return embeddings[0];
	}
}
