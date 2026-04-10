import { EditorPosition, MarkdownView, Plugin } from "obsidian";
import { ActiveEditor } from "../../types";

export class ObsidianActiveEditor implements ActiveEditor {
	constructor(private readonly plugin: Plugin) {
	}

	insertTextAtCursor(text: string): boolean {
		const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = markdownView?.editor;
		if (!editor) return false;

		const cursor = editor.getCursor();

		editor.replaceRange(text, cursor);

		const newCursor: EditorPosition = {
			line: cursor.line,
			ch: cursor.ch + text.length,
		};

		editor.setCursor(newCursor);

		return true;
	}
}
