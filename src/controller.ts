import { NoteService, RelatedNote } from "./services/noteService";

export class AppController {
	constructor(
		private noteService: NoteService
	) { }

	async reindexCurrentActive(): Promise<void> {
		// TODO: Implement
	}

	async reindexAll(): Promise<void> {
		// TODO: Implement
	}

	async getActiveNoteRelations(limit: number): Promise<RelatedNote[]> {
		const path = this.noteService.activeNotePath();
		return await this.getNoteRelations(path, limit);
	}

	async getNoteRelations(path: string, limit: number): Promise<RelatedNote[]> {
		// TODO: Implement
	}
}
