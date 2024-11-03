import * as ort from 'onnxruntime-node';
import { Tokenizer } from 'tokenizers';

export interface IEmbeddingService {
	generateEmbedding(text: string): Promise<Float32Array>;
}

export class ONNXEmbeddingService implements IEmbeddingService {
	private modelPath: string;
	private session: ort.InferenceSession | null = null;
	private tokenizer: Tokenizer;

	constructor(modelPath: string, tokenizerPath: string) {
		this.modelPath = modelPath;
		this.tokenizer = Tokenizer.fromFile(tokenizerPath);
	}

	async initialize(): Promise<void> {
		if (!this.session) {
			this.session = await ort.InferenceSession.create(this.modelPath);
		}
	}

	async generateEmbedding(text: string): Promise<Float32Array> {
		if (!this.session) {
			throw new Error("Model session not initialized. Call 'initialize' before generating embeddings.");
		}

		const tokenIds = await this.tokenizeTextToIds(text);
		const inputTensor = new ort.Tensor('int64', new BigInt64Array(tokenIds.map(BigInt)), [1, tokenIds.length]);

		const feeds = { input_ids: inputTensor };
		const results = await this.session.run(feeds);

		const output = results['output_name']; // TODO: Replace 'output_name' with actual model output name
		return output.data as Float32Array;
	}

	private async tokenizeTextToIds(text: string): Promise<number[]> {
		const encoded = await this.tokenizer.encode(text);
		return encoded.getIds();
	}
}
