import * as ort from 'onnxruntime-node';
import { Tokenizer } from 'tokenizers';

export interface IEmbeddingService {
	generateEmbedding(text: string): Promise<Float32Array>;
}

/**
 * Simple but quality text embedder using ONNX and Tokenizer.
 * Ensures privacy by keeping everything local and avoiding ESM.
 */
export class OnnxEmbeddingService implements IEmbeddingService {
	private tokenizer: Tokenizer | null = null;
	private session: ort.InferenceSession | null = null;

	constructor() {
		this.initializeModel();
	}

	private async initializeModel() {
		this.tokenizer = Tokenizer.fromFile('path/to/tokenizer.json');
		this.session = await ort.InferenceSession.create('path/to/model.onnx');
	}

	async generateEmbedding(text: string): Promise<Float32Array> {
		// TODO: implement
	}
}
