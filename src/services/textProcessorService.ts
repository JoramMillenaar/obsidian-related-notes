import removeMd from 'remove-markdown';


export interface ITextProcessingService {
	processText(text: string): string;
}

export class MarkdownTextProcessingService implements ITextProcessingService {
	processText(text: string): string {
		const cleaned = removeMd(text, { useImgAltText: false });
		// Remove Obsidian-style link
		return cleaned.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1');
	}
}
