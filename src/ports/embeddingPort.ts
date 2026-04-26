export interface EmbeddingPort {
	embed(text: string): Promise<number[] | null>;

	load(): Promise<void>;

	unload(): void;
}
