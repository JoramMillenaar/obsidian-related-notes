import { IndexRepository, PerformanceMonitor, RelatedNote } from "../types";
import { cosineSimilarity, normalizeEmbedding } from "../domain/embedding";
import { EmbedTextUseCase } from "./embedText";


export type GetSimilarNotesUseCase = (args: {
	noteId?: string;
	text?: string;
	limit?: number;
	minScore?: number;
}) => Promise<RelatedNote[]>;

export function makeGetSimilarNotes(deps: {
	indexRepo: IndexRepository;
	embedText: EmbedTextUseCase;
	performanceMonitor: PerformanceMonitor;
}): GetSimilarNotesUseCase {
	return async function getSimilarNotes(args): Promise<RelatedNote[]> {
		return await deps.performanceMonitor.measure(
			"usecase.getSimilarNotes",
			async () => {
				const {
					noteId,
					text,
					limit = 10,
					minScore = 0.25,
				} = args;

				// Prefer using an existing embedding if we have a noteId in the index.
				let queryEmbedding: number[] | undefined;

				if (noteId) {
					const existing = await deps.indexRepo.findById(noteId);
					if (existing) queryEmbedding = existing.embedding;
				}

				// If not found, we need text to compute the query embedding.
				if (!queryEmbedding) {
					if (!text) {
						throw new Error("getRelatedNotes: need either noteId present in index, or text to embed.");
					}
					const embedding = await deps.embedText(text);
					if (!embedding) throw new Error("getRelatedNotes: could not embed text");
					queryEmbedding = normalizeEmbedding(embedding);
				}

				const finalEmbedding = queryEmbedding;
				if (!finalEmbedding) {
					throw new Error("getRelatedNotes: missing query embedding");
				}

				const indexedNotes = await deps.indexRepo.listAll();

				return indexedNotes
					.filter(n => (noteId ? n.id !== noteId : true))
					.map(n => ({
						id: n.id,
						score: cosineSimilarity(finalEmbedding, n.embedding),
					}))
					.filter(r => Number.isFinite(r.score) && r.score >= minScore)
					.sort((a, b) => b.score - a.score)
					.slice(0, limit);
			},
		);
	};
}
