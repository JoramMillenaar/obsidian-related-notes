import { ComputeEmbedding, GetIndex, GetNoteText, ListNoteIds, SaveIndex } from "./types";
import { indexNote } from "./app/indexNote";
import { getRelatedNotes } from "./app/getRelatedNotes";
import { buildIndex } from "./app/buildIndex";
import { deleteNoteInIndex } from "./app/deleteNoteInIndex";
import { renameNoteInIndex } from "./app/renameNoteInIndex";
import { getSyncActions } from "./app/getSyncActions";
import { executeSyncActions } from "./app/executeSyncActions";

export class RelatedNotesFacade {
	constructor(private deps: {
		listNoteIds: ListNoteIds;
		getNoteText: GetNoteText;
		getIndex: GetIndex;
		saveIndex: SaveIndex;
		computeEmbedding: ComputeEmbedding;
		load: () => Promise<void>;
		unload: () => void;
	}) {
	}

	async indexVault(opts?: {
		batchSize?: number;
		onProgress?: (p: { phase: string; processed: number; total: number }) => void;
		onBatchComplete?: () => Promise<void>;
	}) {
		return buildIndex({
			listNoteIds: this.deps.listNoteIds,
			indexNote: async (noteId: string) => {
				await indexNote({
					noteId,
					getNoteText: this.deps.getNoteText,
					getIndex: this.deps.getIndex,
					saveIndex: this.deps.saveIndex,
					computeEmbedding: this.deps.computeEmbedding,
				});
			},
			...opts,
		});
	}

	async syncVaultToIndex(opts?: {
		batchSize?: number;
		onProgress?: (p: { phase: string; processed: number; total: number }) => void;
		onBatchComplete?: () => Promise<void>;
	}) {
		const actions = await getSyncActions({listNoteIds: this.deps.listNoteIds, getIndex: this.deps.getIndex})
		await executeSyncActions({
			actions,
			onBatchComplete: opts?.onBatchComplete,
			onProgress: opts?.onProgress,
			indexNote: async (noteId: string) => {
				await indexNote({
					noteId,
					getNoteText: this.deps.getNoteText,
					getIndex: this.deps.getIndex,
					saveIndex: this.deps.saveIndex,
					computeEmbedding: this.deps.computeEmbedding,
				});
			},
			batchSize: opts?.batchSize,
			deleteNote: this.deleteNote
		})
	}


	async upsertNoteToIndex(noteId: string) {
		await indexNote({
			noteId,
			getNoteText: this.deps.getNoteText,
			getIndex: this.deps.getIndex,
			saveIndex: this.deps.saveIndex,
			computeEmbedding: this.deps.computeEmbedding,
		});
	}

	async getSimilarNotes(args: { noteId?: string; text?: string; limit?: number; minScore?: number }) {
		try {
			return await getRelatedNotes({
				...args,
				getIndex: this.deps.getIndex,
				computeEmbedding: this.deps.computeEmbedding,
			});
		} catch {
			return [];
		}
	}

	async isIndexEmpty() {
		const index = await this.deps.getIndex();
		return index.length === 0;
	}

	async getCleanNoteText(noteId: string) {
		const text = await this.deps.getNoteText(noteId);
		return text?.trim() ?? "";
	}

	async isNoteEmpty(noteId: string) {
		const text = await this.getCleanNoteText(noteId);
		return text.length === 0;
	}

	async deleteNote(noteId: string) {
		await deleteNoteInIndex({
			noteId,
			getIndex: this.deps.getIndex,
			saveIndex: this.deps.saveIndex,
		});
	}

	async renameNote(oldId: string, newId: string) {
		await renameNoteInIndex({
			oldId,
			newId,
			getIndex: this.deps.getIndex,
			saveIndex: this.deps.saveIndex,
		});
	}

	async start() {
		await this.deps.load();
	}

	stop() {
		this.deps.unload();
	}

}
