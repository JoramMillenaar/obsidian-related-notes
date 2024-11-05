export interface IEmbeddingService {
	generateEmbedding(text: string): Promise<Float32Array>;
}
