export interface MarkdownTextExtractor {
	extract(markdown: string): Promise<string>;
}
