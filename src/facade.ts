import { ComputeEmbedding, GetIndex, GetNoteText, ListNoteIds, SaveIndex } from "./types";
import { indexNote } from "./app/indexNote";
import { getRelatedNotes } from "./app/getRelatedNotes";
import { syncVault } from "./app/syncVault";
import { deleteNoteInIndex } from "./app/deleteNoteInIndex";
import { renameNoteInIndex } from "./app/renameNoteInIndex";
import { rebuildIndex } from "./app/rebuildIndex";

export class RelatedNotesFacade {
	private indexQueue = new Map<string, number>();
	private isProcessing = false;

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

	async syncVaultToIndex(opts?: {
		deleteMissing?: boolean;
		batchSize?: number;
		onProgress?: (p: { phase: "scan" | "index" | "cleanup"; processed: number; total: number }) => void;
		onBatchComplete?: () => Promise<void>;
	}) {
		return syncVault({
			listNoteIds: this.deps.listNoteIds,
			getIndex: this.deps.getIndex,
			saveIndex: this.deps.saveIndex,
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
		return getRelatedNotes({
			...args,
			getIndex: this.deps.getIndex,
			computeEmbedding: this.deps.computeEmbedding,
		});
	}

	async enqueueIndex(noteId: string) {
		const existing = this.indexQueue.get(noteId);
		if (existing) clearTimeout(existing);

		const timeout = window.setTimeout(() => {
			this.indexQueue.delete(noteId);
			this.processQueue().catch(console.error);
		}, 5000);

		this.indexQueue.set(noteId, timeout);
	}

	private async processQueue() {
		if (this.isProcessing) return;
		this.isProcessing = true;

		try {
			for (const noteId of Array.from(this.indexQueue.keys())) {
				this.indexQueue.delete(noteId);
				await this.upsertNoteToIndex(noteId);
			}
		} finally {
			this.isProcessing = false;
		}
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

	async rebuildVaultIndex() {
		await rebuildIndex({
			listNoteIds: this.deps.listNoteIds,
			saveIndex: this.deps.saveIndex,
			indexNote: (id) => this.upsertNoteToIndex(id),
		});
	}

	async start() {
		await this.deps.load();
	}

	stop() {
		this.deps.unload();
	}

}
