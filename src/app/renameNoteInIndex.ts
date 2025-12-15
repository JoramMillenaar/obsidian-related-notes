import { GetIndex, SaveIndex } from "../types";

export async function renameNoteInIndex(args: {
	oldId: string;
	newId: string;
	getIndex: GetIndex;
	saveIndex: SaveIndex;
}): Promise<boolean> {
	const {oldId, newId, getIndex, saveIndex} = args;

	const index = await getIndex();
	let changed = false;

	const next = index.map(n => {
		if (n.id === oldId) {
			changed = true;
			return {...n, id: newId};
		}
		return n;
	});

	if (!changed) return false;

	await saveIndex(next);
	return true;
}
