export interface IIndexService {
	initializeIndex(): Promise<void>;
	insert(vector: Float32Array, text: string): Promise<void>;
	search(vector: Float32Array, k: number): Promise<{ distance: number, text: string }[]>;
	isInitialized(): Promise<boolean>;
	dropIndex(): Promise<void>;
}
