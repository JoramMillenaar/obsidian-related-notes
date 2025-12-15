import { ListNoteIds, SaveIndex } from "../types";

export async function rebuildIndex(args: {
	listNoteIds: ListNoteIds;
	saveIndex: SaveIndex;
	indexNote: (noteId: string) => Promise<void>;
}): Promise<void> {
	const {listNoteIds, saveIndex, indexNote} = args;

	// 1) hard reset
	await saveIndex([]);

	// 2) reindex all notes sequentially
	const ids = await listNoteIds();
	for (const id of ids) {
		await indexNote(id);
	}
}
