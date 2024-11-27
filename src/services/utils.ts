export function getNoteTitleFromPath(path: string): string {
	const filename = path.split('/').pop() || '';
	return filename.replace('.md', '');
}
