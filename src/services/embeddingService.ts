import axios from 'axios';
import { DefaultApi, EmbeddingsPutRequest, EmbeddingsPostRequest, SimilarPostRequest } from './generated_api/api';
import { ServerProcessSupervisor } from 'src/server';

/**
 * Provides an abstraction for interacting with a local API process that manages embeddings.
 */
export class EmbeddingService {
	apiClient: DefaultApi;
	serverSupervisor: ServerProcessSupervisor;
	basePath: string;
	port: number;

	constructor(port: number, basePath: string) {
		this.serverSupervisor = new ServerProcessSupervisor(basePath);
		this.basePath = basePath;
		this.port = port;
		this.apiClient = new DefaultApi(undefined, this.basePath, this.setupLocalAPIClient());
	}

	async ready(): Promise<void> {
		await this.serverSupervisor.ensureServerRunning(this.port);
	}

	private setupLocalAPIClient() {
		return axios.create({
			baseURL: 'http://localhost:' + this.port,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	unload() {
		this.serverSupervisor.terminateServer();
	}

	async update(path: string, text: string): Promise<void> {
		await this.ready();
		const requestBody: EmbeddingsPutRequest = {
			id: path,
			text: text,
			metadata: { path }
		};
		await this.apiClient.embeddingsPut(requestBody).catch((error) => {
			console.error('Failed to update embedding:', error);
		});
	}

	async deleteAll(): Promise<void> {
		await this.ready();
		await this.apiClient.embeddingsAllDelete().then(() => {
			console.log('All embeddings deleted successfully');
		}).catch((error) => {
			console.error('Failed to delete all embeddings:', error);
		});
	}

	async create(path: string, text: string): Promise<void> {
		await this.ready();
		const requestBody: EmbeddingsPostRequest = {
			id: path,
			text: text,
			metadata: { path }
		};
		await this.apiClient.embeddingsPost(requestBody).catch((error) => {
			console.error('Failed to create embedding:', error);
		});
	}

	async delete(path: string): Promise<void> {
		await this.ready();
		await this.apiClient.embeddingsIdDelete(path).catch((error) => {
			console.error('Failed to delete embedding:', error);
		});
	}

	async fetchSimilar(text: string, limit: number): Promise<{ id: string, similarity: number }[]> {
		await this.ready();
		const request: SimilarPostRequest = {
			text: text,
			limit: limit
		};
		return await this.apiClient.similarPost(request).then((response) => {
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
