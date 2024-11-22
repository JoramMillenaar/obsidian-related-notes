import { Plugin } from "obsidian";

export class StatusBarService {
	private statusBarItem: HTMLElement;

	constructor(plugin: Plugin) {
		this.statusBarItem = plugin.addStatusBarItem();
	}

	/**
	 * Updates the status bar text.
	 * @param text The text to display on the status bar.
	 */
	update(text: string): void {
		this.statusBarItem.setText(text);
	}

	/**
	 * Clears the status bar text.
	 */
	clear(): void {
		this.statusBarItem.setText("");
	}
}
