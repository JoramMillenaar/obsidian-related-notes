export async function removeNoteIndex(path: string): Promise<void> {}

export async function createNoteIndex(path: string): Promise<void> {}

export async function updateNoteIndex(path: string): Promise<void> {
	removeNoteIndex(path);
	createNoteIndex(path);
}

export async function listRelatedNotes(path: string, count: number): Promise<string[]> {return []}

export async function removeAllNoteIndices(): Promise<void> {}

export async function createManyNoteIndices(paths: string[]): Promise<void> {}
