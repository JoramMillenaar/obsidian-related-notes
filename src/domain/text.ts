import { Component, MarkdownRenderer } from "obsidian";

export function hashText(text: string): string {
	let hash = 0x811c9dc5;

	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}


export async function cleanMarkdownToPlainText(markdown: string, component: Component) {
	return ((await removeMarkdown(convertMarkdownTableToText(markdown), component)) || "").trim();
}

async function removeMarkdown(markdown: string, component: Component) {
	const el = document.createElement("div");
	await MarkdownRenderer.render(this.app, markdown, el, "", component);
	return (el.textContent ?? "").trim();
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
