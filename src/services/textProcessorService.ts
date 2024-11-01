import TurndownService from 'turndown';
import removeMd from 'remove-markdown';


export interface ITextProcessingService {
	processText(text: string): string;
}

export class MarkdownTextProcessingService implements ITextProcessingService {
	private turndownService: TurndownService;

	constructor() {
		this.turndownService = new TurndownService();
	}

	processText(text: string): string {
		const markdown = this.turndownService.turndown(text);
		return removeMd(markdown, { useImgAltText: false });
	}
}
