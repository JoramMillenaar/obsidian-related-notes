import removeMd from "remove-markdown";


export function hashText(text: string): string {
	let hash = 0x811c9dc5;

	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}

type TextProcessor = (text: string) => string;

const processors: TextProcessor[] = [
	removeObsidianMetadata,
	removeObsidianLinkSyntax,
	convertMarkdownTableToText,
	removeMarkdown,
];

export function cleanMarkdownToPlainText(markdown: string): string {
	return processors.reduce((text, processor) => processor(text), markdown).trim();
}

function removeMarkdown(markdown: string): string {
	return removeMd(markdown, {useImgAltText: false});
}

function removeObsidianLinkSyntax(markdown: string): string {
	// [[note]] or [[note|alias]] → note
	return markdown.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1");
}

function removeObsidianMetadata(markdown: string): string {
	// Frontmatter (--- or +++)
	return markdown
		.replace(
			/^(---[\s\S]*?---|\+\+\+[\s\S]*?\+\+\+)\s*/m,
			""
		)
		.replace(/^\s*$/gm, "")
		.trim();
}

function convertMarkdownTableToText(markdown: string): string {
	const lines = markdown.split("\n");
	const tableLines = lines.filter(line => line.includes("|"));

	if (tableLines.length < 2) return markdown;

	const [headerLine, separatorLine, ...dataLines] = tableLines;
	if (!separatorLine.includes("-")) return markdown;

	const headers = headerLine
		.split("|")
		.map(c => c.trim())
		.filter(Boolean);

	const rows = dataLines.map(line =>
		line
			.split("|")
			.map(c => c.trim())
			.filter(Boolean)
	);

	const plainText = rows
		.map(row =>
			headers
				.map((h, i) => `${h}: ${row[i] ?? ""}`)
				.join(", ")
		)
		.join(". ");

	return markdown.replace(tableLines.join("\n"), plainText);
}
