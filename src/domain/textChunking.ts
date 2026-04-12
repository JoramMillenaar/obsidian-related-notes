export const DEFAULT_EMBEDDING_CHUNK_WINDOW_SIZE = 1500;
export const DEFAULT_EMBEDDING_CHUNK_OVERLAP = 200;

export function chunkTextByFixedWindow(
	text: string,
	options: {
		windowSize?: number;
		overlap?: number;
	} = {},
): string[] {
	const windowSize = options.windowSize ?? DEFAULT_EMBEDDING_CHUNK_WINDOW_SIZE;
	const overlap = options.overlap ?? DEFAULT_EMBEDDING_CHUNK_OVERLAP;

	if (windowSize <= 0) {
		throw new Error("chunkTextByFixedWindow: windowSize must be greater than 0");
	}

	if (overlap < 0 || overlap >= windowSize) {
		throw new Error("chunkTextByFixedWindow: overlap must be between 0 and windowSize - 1");
	}

	const source = text.trim();
	if (!source) return [];

	if (source.length <= windowSize) {
		return [source];
	}

	const step = windowSize - overlap;
	const chunks: string[] = [];

	for (let start = 0; start < source.length; start += step) {
		const chunk = source.slice(start, start + windowSize).trim();
		if (chunk) {
			chunks.push(chunk);
		}

		if (start + windowSize >= source.length) {
			break;
		}
	}

	return chunks;
}
