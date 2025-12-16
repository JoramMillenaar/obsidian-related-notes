import { ComputeEmbedding, GetIndex, GetNoteText, IndexedNote, SaveIndex } from "../types";
import { hashText } from "../domain/text";
import { normalizeEmbedding } from "../domain/embedding";
import { deleteNoteInIndex } from "./deleteNoteInIndex";

export async function indexNote(args: {
	noteId: string;
	getNoteText: GetNoteText;
	getIndex: GetIndex;
	saveIndex: SaveIndex;
	computeEmbedding: ComputeEmbedding;
}): Promise<void> {
	const {
		noteId,
		getNoteText,
		getIndex,
		saveIndex,
		computeEmbedding,
	} = args;

	// 1. Load note contents
	const text = await getNoteText(noteId);
	if (text == null) {
		throw new Error("Could not find note with id " + noteId);
	}

	// 2. Compute content hash (cheap, always)
	const hash = hashText(text);

	// 3. Load index and check existing entry
	const index = await getIndex();
	const existing = index.find(n => n.id === noteId);

	if (existing && existing.contentHash === hash) return;

	// 4. Compute embedding (expensive, only if needed)
	const embedding = await computeEmbedding(text);
	if (!embedding?.length) {
		await deleteNoteInIndex({
			noteId,
			getIndex: this.deps.getIndex,
			saveIndex: this.deps.saveIndex,
		});
		return;
	}

	const updated: IndexedNote = {
		id: noteId,
		embedding: normalizeEmbedding(embedding),
		contentHash: hash,
		updatedAt: new Date().toISOString(),
	};

	// 5. Upsert
	const nextIndex = existing
		? index.map(n => (n.id === noteId ? updated : n))
		: [...index, updated];

	await saveIndex(nextIndex);
}
