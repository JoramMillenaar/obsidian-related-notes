import axios from 'axios';
import { DefaultApi, EmbeddingsPutRequest, EmbeddingsPostRequest, SimilarPostRequest } from './generated_api/api';
import { ServerProcessSupervisor } from 'src/server';
import { logError } from './utils';
import getPort from 'get-port';

/**
 * Provides an abstraction for interacting with a local API process that manages embeddings.
 */
export class EmbeddingService {
	apiClient: DefaultApi;
	serverSupervisor: ServerProcessSupervisor;
	basePath: string;

	constructor(basePath: string) {
		this.serverSupervisor = new ServerProcessSupervisor(basePath);
		this.basePath = basePath;
	}

	async ready(): Promise<void> {
		if (!this.serverSupervisor.isServerRunning()) {
			await this.serverSupervisor.startNewServer(await getPort());
		}
		const port = this.serverSupervisor.getServerPort();
		const axiosClient = this.setupLocalAPIClient(port)
		this.apiClient = new DefaultApi(undefined, this.basePath, axiosClient);
	}

	private setupLocalAPIClient(port: number) {
		return axios.create({
			baseURL: 'http://localhost:' + port,
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
			logError('Failed to update embedding:', error);
		});
	}

	async deleteAll(): Promise<void> {
		await this.ready();
		await this.apiClient.embeddingsAllDelete().then(() => {
		}).catch((error) => {
			logError('Failed to delete all embeddings:', error);
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
			logError('Failed to create embedding:', error);
		});
	}

	async delete(path: string): Promise<void> {
		await this.ready();
		await this.apiClient.embeddingsIdDelete(path).catch((error) => {
			logError('Failed to delete embedding:', error);
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
			logError('Failed to fetch similar texts: ', error, request);
			return [];
		});
	}
}
