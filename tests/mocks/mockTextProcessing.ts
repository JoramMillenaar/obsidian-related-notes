import { ITextProcessingService } from '../../src/services/textProcessorService';

export class MockTextProcessingService implements ITextProcessingService {
    processText(text: string): string {
        console.log(`Mock: processText called with text: "${text}"`);
        // Return a string simulating the processing of text
        return text.replace(/\*\*(.*?)\*\*/g, '$1'); // Simplistic removal of markdown bold
    }
}
