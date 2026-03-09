import { IndexedNote, IndexedNoteRepository, IndexStorage } from "../../types";

export class JsonIndexedNoteRepository implements IndexedNoteRepository {
	constructor(
		private readonly indexStorage: IndexStorage,
	) {
	}

	async findById(noteId: string): Promise<IndexedNote | null> {
		const index = await this.indexStorage.getIndex();
		return index.find(n => n.id === noteId) ?? null;
	}

	async upsert(note: IndexedNote) {
		await this.upsertMany([note]);
	}

	async upsertMany(notes: IndexedNote[]) {
		if (notes.length === 0) return;

		const index = await this.indexStorage.getIndex();

		const map = new Map(index.map(n => [n.id, n]));

		for (const note of notes) {
			map.set(note.id, note);
		}

		await this.indexStorage.saveIndex([...map.values()]);
	}

	async remove(noteId: string) {
		const index = await this.indexStorage.getIndex();
		const next = index.filter(n => n.id !== noteId);
		await this.indexStorage.saveIndex(next);
	}

	async rename(oldId: string, newId: string) {
		if (oldId === newId) return;

		const index = await this.indexStorage.getIndex();

		const existing = index.find(n => n.id === oldId);
		if (!existing) return;

		const filtered = index.filter(n => n.id !== oldId && n.id !== newId);

		const renamed: IndexedNote = {
			...existing,
			id: newId,
		};

		await this.indexStorage.saveIndex([...filtered, renamed]);
	}
}
