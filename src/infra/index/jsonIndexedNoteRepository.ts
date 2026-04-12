import { IndexedNote, IndexRepository, IndexStorage, PerformanceMonitor } from "../../types";

export class JsonIndexedNoteRepository implements IndexRepository {
	constructor(
		private readonly storage: IndexStorage,
		private readonly performanceMonitor?: PerformanceMonitor,
	) {
	}

	async findById(noteId: string): Promise<IndexedNote | null> {
		return await this.performanceMonitor?.measure(
			"infra.indexRepo.findById",
			async () => {
				const index = await this.storage.getAll();
				return index.find(n => n.id === noteId) ?? null;
			},
		) ?? await (async () => {
			const index = await this.storage.getAll();
			return index.find(n => n.id === noteId) ?? null;
		})();
	}

	async upsert(note: IndexedNote) {
		await this.upsertMany([note]);
	}

	async upsertMany(notes: IndexedNote[]) {
		if (notes.length === 0) return;

		await this.performanceMonitor?.measure(
			"infra.indexRepo.upsertMany",
			async () => {
				const index = await this.storage.getAll();

				const map = new Map(index.map(n => [n.id, n]));

				for (const note of notes) {
					map.set(note.id, note);
				}

				await this.storage.rewrite([...map.values()]);
			},
		) ?? await (async () => {
			const index = await this.storage.getAll();

			const map = new Map(index.map(n => [n.id, n]));

			for (const note of notes) {
				map.set(note.id, note);
			}

			await this.storage.rewrite([...map.values()]);
		})();
	}

	async listAll(): Promise<IndexedNote[]> {
		return await this.performanceMonitor?.measure(
			"infra.indexRepo.listAll",
			() => this.storage.getAll(),
		) ?? await this.storage.getAll();
	}

	async isEmpty(): Promise<boolean> {
		return await this.performanceMonitor?.measure(
			"infra.indexRepo.isEmpty",
			() => this.storage.isEmpty(),
		) ?? await this.storage.isEmpty();
	}

	async remove(noteId: string) {
		await this.performanceMonitor?.measure(
			"infra.indexRepo.remove",
			async () => {
				const index = await this.storage.getAll();
				const next = index.filter(n => n.id !== noteId);
				await this.storage.rewrite(next);
			},
		) ?? await (async () => {
			const index = await this.storage.getAll();
			const next = index.filter(n => n.id !== noteId);
			await this.storage.rewrite(next);
		})();
	}

	async rename(oldId: string, newId: string) {
		if (oldId === newId) return;

		await this.performanceMonitor?.measure(
			"infra.indexRepo.rename",
			async () => {
				const index = await this.storage.getAll();

				const existing = index.find(n => n.id === oldId);
				if (!existing) return;

				const filtered = index.filter(n => n.id !== oldId && n.id !== newId);

				const renamed: IndexedNote = {
					...existing,
					id: newId,
				};

				await this.storage.rewrite([...filtered, renamed]);
			},
		) ?? await (async () => {
			const index = await this.storage.getAll();

			const existing = index.find(n => n.id === oldId);
			if (!existing) return;

			const filtered = index.filter(n => n.id !== oldId && n.id !== newId);

			const renamed: IndexedNote = {
				...existing,
				id: newId,
			};

			await this.storage.rewrite([...filtered, renamed]);
		})();
	}

	async clear(): Promise<void> {
		await this.performanceMonitor?.measure(
			"infra.indexRepo.clear",
			() => this.storage.rewrite([]),
		) ?? await this.storage.rewrite([]);
	}
}
