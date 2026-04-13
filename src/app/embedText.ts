import { averageEmbeddings } from "../domain/embedding";
import { chunkTextByFixedWindow } from "../domain/textChunking";
import { EmbeddingPort } from "../types";

export type EmbedTextUseCase = (text: string) => Promise<number[] | null>;
export type EmbedChunksUseCase = (chunks: string[]) => Promise<number[] | null>;

export function makeEmbedText(deps: {
	embedder: EmbeddingPort;
}): EmbedTextUseCase {
	return async function embedText(text: string): Promise<number[] | null> {
		const chunks = chunkTextByFixedWindow(text);
		return embedChunks(chunks, deps.embedder);
	};
}

export function makeEmbedChunks(deps: {
	embedder: EmbeddingPort;
}): EmbedChunksUseCase {
	return async function embedPreparedChunks(chunks: string[]): Promise<number[] | null> {
		return embedChunks(chunks, deps.embedder);
	};
}

async function embedChunks(
	chunks: string[],
	embedder: EmbeddingPort,
): Promise<number[] | null> {
	if (chunks.length === 0) return null;

	const embeddings: number[][] = [];

	for (const chunk of chunks) {
		const embedding = await embedder.embed(chunk);
		if (embedding?.length) {
			embeddings.push(embedding);
		}
	}

	return averageEmbeddings(embeddings);
}
