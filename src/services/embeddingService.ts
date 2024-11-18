import { AxiosInstance } from 'axios';
import { DefaultApi, EmbeddingsPutRequest, EmbeddingsPostRequest, SimilarPostRequest } from './generated_api/api';


/**
 * Provides an abstraction for interacting with a local API process that manages embeddings.
 * The API process runs on a separate process, handling embedding-related tasks that require 
 * their own environment and cannot operate within Obsidian's sandboxed (main) process.
 *
 * Features:
 * - Create, update, and delete embeddings associated with text and metadata.
 * - Query similar embeddings based on a given text, with configurable result limits.
 * - Leverages an OpenAPI-generated client for seamless communication with the local API.
 */
export class EmbeddingService {
	private apiClient: DefaultApi;

	constructor(apiClient: AxiosInstance, private basePath?: string) {
		this.apiClient = new DefaultApi(undefined, basePath, apiClient);
	}

	async update(path: string, text: string): Promise<void> {
		const requestBody: EmbeddingsPutRequest = {
			id: path,
			text: text,
			metadata: { path }
		};
		await this.apiClient.embeddingsPut(requestBody).then(() => {
			console.log('Embedding updated successfully');
		}).catch((error) => {
			console.error('Failed to update embedding:', error);
		});
	}

	async deleteAll(): Promise<void> {
		await this.apiClient.embeddingsAllDelete().then(() => {
			console.log('All embeddings deleted successfully');
		}).catch((error) => {
			console.error('Failed to delete all embeddings:', error);
		});
	}

	async create(path: string, text: string): Promise<void> {
		const requestBody: EmbeddingsPostRequest = {
			id: path,
			text: text,
			metadata: { path }
		};
		await this.apiClient.embeddingsPost(requestBody).then((response) => {
			console.log('Embedding created with ID:', response.data.id);
		}).catch((error) => {
			console.error('Failed to create embedding:', error);
		});
	}

	async fetchSimilar(text: string, limit: number): Promise<{ id: string, similarity: number }[]> {
		const request: SimilarPostRequest = {
			text: text,
			limit: limit
		};
		return await this.apiClient.similarPost(request).then((response) => {
			console.log('Fetched similar texts successfully');
			return response.data.filter(item => item.id !== undefined && item.similarity !== undefined).map(item => ({
				id: item.id as string,
				similarity: item.similarity as number
			}));
		}).catch((error) => {
			console.error('Failed to fetch similar texts: ', error, request);
			return [];
		});
	}
}
