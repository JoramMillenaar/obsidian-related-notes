import { averageEmbeddings } from "../domain/embedding";
import { chunkTextByFixedWindow } from "../domain/textChunking";
import { EmbeddingPort } from "../types";

export type EmbedTextUseCase = (text: string) => Promise<number[] | null>;

export function makeEmbedText(deps: {
	embedder: EmbeddingPort;
}): EmbedTextUseCase {
	return async function embedText(text: string): Promise<number[] | null> {
		const chunks = chunkTextByFixedWindow(text);
		if (chunks.length === 0) return null;

		const embeddings: number[][] = [];

		for (const chunk of chunks) {
			const embedding = await deps.embedder.embed(chunk);
			if (embedding?.length) {
				embeddings.push(embedding);
			}
		}

		return averageEmbeddings(embeddings);
	};
}
