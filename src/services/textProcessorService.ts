import removeMd from 'remove-markdown';

export interface ITextProcessingService {
	processText(text: string): string;
}

export class MarkdownTextProcessingService implements ITextProcessingService {
	private processors: ((text: string) => string)[];

	constructor() {
		this.processors = [
			removeMarkdown,
			removeObsidianLinkSyntax,
			convertMarkdownTableToText,
			removeObsidianMetadata
		];
	}

	addProcessor(processor: (text: string) => string): void {
		this.processors.push(processor);
	}

	processText(text: string): string {
		return this.processors.reduce((result, processor) => processor(result), text);
	}
}

// Utility functions for text processing

function removeObsidianMetadata(markdown: string): string {
    return markdown
        .replace(/^(---[\s\S]*?---|^\+\+\+[\s\S]*?\+\+\+|^[a-zA-Z0-9_-]+:\s*.*(?:\n[a-zA-Z0-9_-]+:\s*.*)*\n)/, '')
        .replace(/^\s*$/gm, '')
        .trim();
}

function removeMarkdown(markdown: string): string {
	return removeMd(markdown, { useImgAltText: false });
}

function removeObsidianLinkSyntax(markdown: string): string {
	return markdown.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1');
}

function convertMarkdownTableToText(markdown: string): string {
	const lines = markdown.split('\n');
	const tableLines = lines.filter(line => line.includes('|'));

	if (tableLines.length < 2) {
		return markdown; // Return the original markdown if no valid table
	}

	const [headerLine, separatorLine, ...dataLines] = tableLines;
	const headers = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);

	if (!separatorLine.includes('-')) {
		return markdown;
	}

	const rows = dataLines.map(line =>
		line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
	);

	const plainTextRows = rows.map(row => {
		return headers.map((header, index) => {
			const cellValue = row[index] || '';
			return `${header}: ${cellValue}`;
		}).join(', ');
	});

	const plainTextTable = plainTextRows.join('. ');

	// Replace the table in the markdown with plain text
	return markdown.replace(tableLines.join('\n'), plainTextTable);
}
