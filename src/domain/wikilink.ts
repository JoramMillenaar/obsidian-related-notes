export function getNoteNameFromId(noteId: string): string {
	return noteId.split("/").pop()?.replace(/\.md$/i, "") ?? noteId;
}

export function formatWikilink(noteId: string): string {
	return `[[${getNoteNameFromId(noteId)}]]`;
}
