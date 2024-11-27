export function getNoteTitleFromPath(path: string): string {
	const filename = path.split('/').pop() || '';
	return filename.replace('.md', '');
}

export function logError(message: any, ...optionalParams: any[]) {
	console.error('[Related Notes]:', message, ...optionalParams);
}
