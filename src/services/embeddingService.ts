import { AxiosInstance } from 'axios';
import { DefaultApi, EmbeddingsIdPutRequest, EmbeddingsPostRequest, SimilarPostRequest } from './generated_api/api';

export class EmbeddingService {
    private apiClient: DefaultApi;

    constructor(apiClient: AxiosInstance, private basePath?: string) {
        this.apiClient = new DefaultApi(undefined, basePath, apiClient);
    }

    async update(path: string, text: string): Promise<void> {
        const requestBody: EmbeddingsIdPutRequest = {
            text: text,
            metadata: { path }
        };
        await this.apiClient.embeddingsIdPut(path, requestBody).then(() => {
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
