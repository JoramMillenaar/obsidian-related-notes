import { ITextChunkingService } from '../../src/services/textChunkingService';

export class MockTextChunkingService implements ITextChunkingService {
    chunkText(text: string, maxTokenCount: number): string[] {
        console.log(`Mock: chunkText called with text: "${text}" and maxTokenCount: ${maxTokenCount}`);
        // Return an array of strings simulating chunking the input text
        return [text.substring(0, maxTokenCount), text.substring(maxTokenCount)];
    }
}
