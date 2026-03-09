import { hashText } from "../domain/text";
import { normalizeEmbedding } from "../domain/embedding";
import { EmbeddingPort, IndexRepository, NoteSource } from "../types";

export type IndexNoteDeps = {
	noteSource: NoteSource;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
};

export type IndexNoteUseCase = (noteId: string) => Promise<void>;

export function makeIndexNote(deps: IndexNoteDeps): IndexNoteUseCase {
	return async function indexNote(noteId: string) {
		const text = await deps.noteSource.getTextById(noteId);
		if (text == null) throw new Error(`Could not find note with id ${noteId}`);

		const contentHash = hashText(text);

		const existing = await deps.indexRepo.findById(noteId);
		if (existing && existing.contentHash === contentHash) {
			return;
		}

		const rawEmbedding = await deps.embedder.embed(text);
		if (!rawEmbedding?.length) {
			await deps.indexRepo.remove(noteId);
			return;
		}

		const indexedNote = {
			id: noteId,
			embedding: normalizeEmbedding(rawEmbedding),
			contentHash,
			updatedAt: new Date().toISOString(),
		};

		await deps.indexRepo.upsert(indexedNote);
	}
}
