import { ComputeEmbedding, GetIndex, RelatedNote } from "../types";
import { cosineSimilarity, normalizeEmbedding } from "../domain/embedding";

export async function getRelatedNotes(args: {
	noteId?: string;
	text?: string;
	getIndex: GetIndex;
	computeEmbedding: ComputeEmbedding;
	limit?: number;
	minScore?: number;
}): Promise<RelatedNote[]> {
	const {
		noteId,
		text,
		getIndex,
		computeEmbedding,
		limit = 10,
		minScore = 0.25,
	} = args;

	const index = await getIndex();
	if (index.length === 0) return [];

	// Prefer using an existing embedding if we have a noteId in the index.
	let queryEmbedding: number[] | undefined;

	if (noteId) {
		const existing = index.find(n => n.id === noteId);
		if (existing) queryEmbedding = existing.embedding;
	}

	// If not found, we need text to compute the query embedding.
	if (!queryEmbedding) {
		if (!text) {
			throw new Error("getRelatedNotes: need either noteId present in index, or text to embed.");
		}
		const embedding = await computeEmbedding(text);
		if (!embedding) throw new Error("getRelatedNotes: could not embed text");
		queryEmbedding = normalizeEmbedding(embedding);
	}

	const finalEmbedding = queryEmbedding;
	if (!finalEmbedding) {
		throw new Error("getRelatedNotes: missing query embedding");
	}

	return index
		.filter(n => (noteId ? n.id !== noteId : true))
		.map(n => ({
			id: n.id,
			score: cosineSimilarity(finalEmbedding, n.embedding),
		}))
		.filter(r => Number.isFinite(r.score) && r.score >= minScore)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}
