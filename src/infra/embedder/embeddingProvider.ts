import { IframeMessenger } from "src/infra/embedder/iframe/messagingService";
import { EmbeddingPort, PerformanceMonitor } from "../../types";


export class EmbeddingProvider implements EmbeddingPort {
	private iframeMessenger: IframeMessenger;

	constructor(private readonly performanceMonitor?: PerformanceMonitor) {
		// @ts-ignore
		const IframeContent = __IFRAME_CONTENTS_PLACEHOLDER__;
		this.iframeMessenger = new IframeMessenger('related-text-iframe', IframeContent);
	}

	async load(): Promise<void> {
		await this.performanceMonitor?.measure(
			"infra.embedder.load",
			() => this.iframeMessenger.initialize(),
		) ?? await this.iframeMessenger.initialize();
	}

	async embed(text: string): Promise<number[] | null> {
		return await this.performanceMonitor?.measure(
			"infra.embedder.embed",
			() => this.iframeMessenger.sendMessage(text),
		) ?? await this.iframeMessenger.sendMessage(text);
	}

	unload(): void {
		this.iframeMessenger.unload();
	}
}
