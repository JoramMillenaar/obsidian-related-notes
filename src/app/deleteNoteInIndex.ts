import { GetIndex, SaveIndex } from "../types";

export async function deleteNoteInIndex(args: {
	noteId: string;
	getIndex: GetIndex;
	saveIndex: SaveIndex;
}): Promise<boolean> {
	const {noteId, getIndex, saveIndex} = args;

	const index = await getIndex();
	const next = index.filter(n => n.id !== noteId);

	if (next.length === index.length) {
		return false; // nothing removed
	}

	await saveIndex(next);
	return true;
}
