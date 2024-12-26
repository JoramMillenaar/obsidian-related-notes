import { Plugin } from "obsidian";

export class StatusBarService {
	private statusBarItem: HTMLElement;
	private clearTimeoutId: number | null = null;

	constructor(plugin: Plugin) {
		this.statusBarItem = plugin.addStatusBarItem();
	}

	/**
	 * Updates the status bar text and optionally clears it after a timeout.
	 * @param text The text to display on the status bar.
	 * @param timeout Optional timeout in milliseconds to auto-clear the text.
	 */
	update(text: string, timeout = 3000): void {
		this.statusBarItem.setText("[Related Notes]: " + text);

		// Clear any existing timeout to avoid race conditions
		if (this.clearTimeoutId !== null) {
			clearTimeout(this.clearTimeoutId);
		}

		// Set a new timeout if specified
		if (timeout !== undefined) {
			this.clearTimeoutId = window.setTimeout(() => {
				this.clear();
				this.clearTimeoutId = null; // Reset after clearing
			}, timeout);
		}
	}

	/**
	 * Clears the status bar text.
	 */
	clear(): void {
		this.statusBarItem.setText("");
	}
}