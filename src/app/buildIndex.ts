import { ListNoteIds } from "../types";

export async function buildIndex(args: {
	listNoteIds: ListNoteIds;
	indexNote: (noteId: string) => Promise<void>;
	batchSize?: number;
	onProgress?: (p: {
		phase: "scan" | "index" | "cleanup";
		processed: number;
		total: number;
	}) => void;
	onBatchComplete?: () => Promise<void>;
}): Promise<{
	scanned: number;
	unchanged: number;
}> {
	const {
		listNoteIds,
		indexNote,
		batchSize = 25,
		onProgress,
		onBatchComplete = async () => {
			await new Promise<void>(r => setTimeout(r, 0));
		},
	} = args;

	const noteIds = listNoteIds();
	const total = noteIds.length;
	onProgress?.({phase: "scan", processed: 0, total});

	let processed = 0;
	let unchanged = 0;

	for (const noteId of noteIds) {
		try {
			await indexNote(noteId);
		} catch {
			unchanged++;
		}
		processed++;

		onProgress?.({phase: "index", processed, total});

		if (processed % batchSize === 0) {
			await onBatchComplete();
		}
	}

	return {
		scanned: total,
		unchanged,
	};
}
