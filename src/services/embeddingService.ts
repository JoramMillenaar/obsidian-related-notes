import axios, { AxiosInstance } from 'axios';
import { DefaultApi, EmbeddingsPutRequest, EmbeddingsPostRequest, SimilarPostRequest } from './generated_api/api';
import { ServerProcessSupervisor } from 'src/server';

export interface EmbeddingService {
	unload(): void
	update(path: string, text: string): Promise<void>
	deleteAll(): Promise<void>
	create(path: string, text: string): Promise<void>
	fetchSimilar(text: string, limit: number): Promise<{ id: string; similarity: number }[]>
}


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
export class APIEmbeddingService implements EmbeddingService {
	apiClient: DefaultApi;
	serverSupervisor: ServerProcessSupervisor | null = null;
	basePath: string;
	port: number;

	constructor(port: number, basePath: string) {
		this.basePath = basePath;
		this.port = port;
		const api = this.setupLocalAPIServer();
		this.apiClient = new DefaultApi(undefined, basePath, api);
	}

	private setupLocalAPIServer(): AxiosInstance {
		this.serverSupervisor = new ServerProcessSupervisor();
		this.serverSupervisor.startServer(this.basePath, this.port);
		return axios.create({
			baseURL: 'http://localhost:' + this.port,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	unload() {
		this.serverSupervisor?.terminateServer();
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


import { spawn } from 'child_process';

export class CLIEmbeddingService implements EmbeddingService {
	constructor(private cwd: string) { }

	private async runCommand(command: string[], textInput?: string, captureOutput = false): Promise<any> {
		return new Promise((resolve, reject) => {
			const processEnv = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` };
			const child = spawn('relate-text', command, {
				cwd: this.cwd,
				env: processEnv,
			});

			let stdout = '';
			let stderr = '';

			// Capture stdout
			if (captureOutput) {
				child.stdout.on('data', (data) => {
					stdout += data.toString();
				});
			} else {
				child.stdout.on('data', (data) => {
					console.log(`CLI Output: ${data.toString()}`);
				});
			}

			// Capture stderr
			child.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			// Handle process exit
			child.on('close', (code) => {
				if (code === 0) {
					if (captureOutput) {
						try {
							resolve(JSON.parse(stdout));
						} catch (parseError) {
							reject(new Error(`Failed to parse CLI output: ${stdout}`));
						}
					} else {
						resolve(undefined);
					}
				} else {
					reject(new Error(stderr || `Process exited with code ${code}`));
				}
			});

			// Write text input to stdin if provided
			if (textInput) {
				child.stdin.write(textInput);
				child.stdin.end();
			}
		});
	}

	unload() { }

	async update(path: string, text: string): Promise<void> {
		const command = ['update', '--id', path];
		await this.runCommand(command, text);
	}

	async deleteAll(): Promise<void> {
		const command = ['delete-all'];
		await this.runCommand(command);
	}

	async create(path: string, text: string): Promise<void> {
		const command = ['create', '--id', path];
		await this.runCommand(command, text);
	}

	async fetchSimilar(text: string, limit: number): Promise<{ id: string; similarity: number }[]> {
		const command = ['similar', '--limit', `${limit}`];
		const results = await this.runCommand(command, text, true);
		return results.map((item: any) => ({
			id: item.id as string,
			similarity: item.score as number,
		}));
	}

	async delete(path: string): Promise<void> {
		const command = ['delete', '--id', path];
		await this.runCommand(command);
	}
}
