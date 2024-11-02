export type Note = {
	match: number;
	title: string;
	path: string;
}

export async function removeNoteIndex(path: string): Promise<void> { }

export async function createNoteIndex(path: string): Promise<void> { }

export async function updateNoteIndex(path: string): Promise<void> {
	removeNoteIndex(path);
	createNoteIndex(path);
}

export async function listRelatedNotes(path: string, count: number): Promise<Note[]> {
	return [
		{ match: 0.99, title: "Cats", path: "Cats.md" },
		{ match: 0.44, title: "Dogs", path: "Dogs.md" },
		{ match: 0.23, title: "Literal Carrots", path: "Literal Carrots.md" },
		{ match: 0.12, title: "Welcome", path: "Welcome.md" }
	]  // Fake notes for now
}

export async function removeAllNoteIndices(): Promise<void> { }

export async function createManyNoteIndices(paths: string[]): Promise<void> { }
