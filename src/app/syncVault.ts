import { GetIndex, ListNoteIds, SaveIndex } from "../types";

export async function syncVault(args: {
	listNoteIds: ListNoteIds;
	getIndex: GetIndex;
	saveIndex: SaveIndex;
	indexNote: (noteId: string) => Promise<void>;
	deleteMissing?: boolean; // default true
	batchSize?: number;      // default 25
	onProgress?: (p: {
		phase: "scan" | "index" | "cleanup";
		processed: number;
		total: number;
	}) => void;

	// Optional “yield to UI” hook so Obsidian doesn’t feel frozen
	onBatchComplete?: () => Promise<void>;
}): Promise<{
	scanned: number;
	unchanged: number;
	removed: number;
}> {
	const {
		listNoteIds,
		getIndex,
		saveIndex,
		indexNote,
		deleteMissing = true,
		batchSize = 25,
		onProgress,
		onBatchComplete = async () => {
			await new Promise<void>(r => setTimeout(r, 0));
		},
	} = args;

	// Phase 1: scan vault
	const noteIds = listNoteIds();
	const total = noteIds.length;
	onProgress?.({phase: "scan", processed: 0, total});

	// Phase 2: index notes (sequential by design)
	let processed = 0;
	let unchanged = 0;

	for (const noteId of noteIds) {
		try {
			await indexNote(noteId);
		} catch {
			unchanged++;  // Naive for now. Improve error handling
		}
		processed++;

		onProgress?.({phase: "index", processed, total});

		if (processed % batchSize === 0) {
			await onBatchComplete();
		}
	}

	// Phase 3: cleanup missing notes
	let removed = 0;
	if (deleteMissing) {
		const existingSet = new Set(noteIds);
		const index = await getIndex();
		const nextIndex = index.filter(entry => existingSet.has(entry.id));

		removed = index.length - nextIndex.length;

		onProgress?.({phase: "cleanup", processed: removed, total: removed});

		if (removed > 0) {
			await saveIndex(nextIndex);
		}
	}

	return {
		scanned: total,
		unchanged,
		removed,
	};
}
