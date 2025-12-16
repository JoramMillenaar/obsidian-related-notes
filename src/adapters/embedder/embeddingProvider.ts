import { IframeMessenger } from "src/adapters/embedder/iframe/messagingService";


export class EmbeddingProvider {
    private iframeMessenger: IframeMessenger;

    constructor() {
        // @ts-ignore
        const IframeContent = __IFRAME_CONTENTS_PLACEHOLDER__;
        this.iframeMessenger = new IframeMessenger('related-text-iframe', IframeContent);
    }

    async ready(): Promise<void> {
        await this.iframeMessenger.initialize();
    }

    async embed(text: string): Promise<number[] | null> {
        return await this.iframeMessenger.sendMessage(text);
    }

    unload(): void {
        this.iframeMessenger.unload();
    }
}
