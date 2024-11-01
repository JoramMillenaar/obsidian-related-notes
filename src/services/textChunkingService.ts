import nlp from 'compromise';


export interface ITextChunkingService {
	chunkText(text: string, maxTokenCount: number): string[];
}

/**
 * Advanced implementation using compromise for token-based chunking.
 * TODO:
 * - Make sure that sentences are processed as a whole and not cut
 * - Make sure the token count actually is accurately calculated
 */
export class TokenBasedChunkingService implements ITextChunkingService {
    chunkText(text: string, maxTokenCount = 100): string[] {
        const doc = nlp(text);
        const terms = doc.terms().out('array');
        const chunks = [];
        let currentChunk = [];

        for (const term of terms) {
            if (currentChunk.length >= maxTokenCount) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [];
            }
            currentChunk.push(term.text);
        }

        if (currentChunk.length) {
            chunks.push(currentChunk.join(' '));
        }

        return chunks;
    }
}
