import { NoteIndexCandidate, RawNote } from "../types";

export interface NoteSource {
	getNoteById(noteId: string): Promise<RawNote | null>;

	listIds(): string[];

	listIndexCandidates(): NoteIndexCandidate[];
}
