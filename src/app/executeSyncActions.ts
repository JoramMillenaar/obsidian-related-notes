import { ReconciliationResult } from "../domain/setReconciliation";

export async function executeSyncActions(args: {
  actions: ReconciliationResult<string>;
  indexNote: (noteId: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  onProgress?: (p: {
    phase: "index" | "delete";
    processed: number;
    total: number;
  }) => void;
  onBatchComplete?: () => Promise<void>;
  batchSize?: number;
}): Promise<{
  indexed: number;
  deleted: number;
}> {
  const {
    actions,
    indexNote,
    deleteNote,
    onProgress,
    onBatchComplete = async () => {
      await new Promise<void>(r => setTimeout(r, 0));
    },
    batchSize = 25,
  } = args;

  const {toAdd, toRemove} = actions;

  // Phase 1: Delete removed notes
  let deleted = 0;
  for (const noteId of toRemove) {
    try {
      await deleteNote(noteId);
      deleted++;
    } catch (error) {
      console.error(`Failed to delete note ${noteId}:`, error);
    }

    onProgress?.({phase: "delete", processed: deleted, total: toRemove.length});

    if (deleted % batchSize === 0) {
      await onBatchComplete();
    }
  }

  // Phase 2: Index new notes
  let indexed = 0;
  for (const noteId of toAdd) {
    try {
      await indexNote(noteId);
      indexed++;
    } catch (error) {
      console.error(`Failed to index note ${noteId}:`, error);
    }

    onProgress?.({phase: "index", processed: indexed, total: toAdd.length});

    if (indexed % batchSize === 0) {
      await onBatchComplete();
    }
  }

  return {
    indexed,
    deleted,
  };
}

