import { Plugin } from "obsidian";

export class StatusBarService {
	private statusBarItem: HTMLElement;
	private clearTimeoutId: number | null = null;

	constructor(plugin: Plugin) {
		this.statusBarItem = plugin.addStatusBarItem();
		this.statusBarItem.addClass("similarity-status");
		this.clear(); // start blank
	}

	update(text: string, timeout: number | null = 3000): void {
		this.statusBarItem.setText(`[Similarity]: ${text}`);

		if (this.clearTimeoutId !== null) {
			window.clearTimeout(this.clearTimeoutId);
			this.clearTimeoutId = null;
		}

		if (timeout !== null) {
			this.clearTimeoutId = window.setTimeout(() => {
				this.clear();
			}, timeout);
		}
	}

	clear(): void {
		if (this.clearTimeoutId !== null) {
			window.clearTimeout(this.clearTimeoutId);
			this.clearTimeoutId = null;
		}
		this.statusBarItem.setText("");
	}

	unload(): void {
		this.clear();
	}
}
