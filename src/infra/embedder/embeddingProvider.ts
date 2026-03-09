import { IframeMessenger } from "src/infra/embedder/iframe/messagingService";
import { EmbeddingPort } from "../../types";


export class EmbeddingProvider implements EmbeddingPort {
	private iframeMessenger: IframeMessenger;

	constructor() {
		// @ts-ignore
		const IframeContent = __IFRAME_CONTENTS_PLACEHOLDER__;
		this.iframeMessenger = new IframeMessenger('related-text-iframe', IframeContent);
	}

	async load(): Promise<void> {
		await this.iframeMessenger.initialize();
	}

	async embed(text: string): Promise<number[] | null> {
		return await this.iframeMessenger.sendMessage(text);
	}

	unload(): void {
		this.iframeMessenger.unload();
	}
}
