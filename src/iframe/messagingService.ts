export interface IframeMessage {
    requestId: number;
    payload: string;
}

export type IframeResponse = {
    data: Float32Array,
    dims: number[],
    type: string,
}

export class IframeMessenger {
    private iframe: HTMLIFrameElement | null = null;
    private requestIdCounter = 0;
    private pendingRequests = new Map<number, (data: Float32Array) => void>();

    constructor(private iframeId: string, private workerScript: string) {}

    async initialize(): Promise<void> {
        if (this.iframe) return;

        const existingIframe = document.getElementById(this.iframeId) as HTMLIFrameElement | null;
        if (existingIframe) {
            this.iframe = existingIframe;
            return;
        }

        this.iframe = document.body.createEl('iframe', {
            attr: {
                id: this.iframeId,
                style: "display: none;",
                srcdoc: this.workerScript,
            },
        });

        window.removeEventListener('message', this.onMessageReceived);
        window.addEventListener('message', this.onMessageReceived);
    }

    private onMessageReceived = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        const { requestId, data, error }: { requestId: number; data: IframeResponse; error?: string } = event.data;
        if (this.pendingRequests.has(requestId)) {
            const resolve = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            if (error) {
                console.error(`Error from iframe: ${error}`);
                return;
            }
            resolve?.(data.data);
        } else {
            console.warn(`Unrecognized requestId: ${requestId}`);
        }
    };

    sendMessage(payload: string): Promise<Float32Array> {
        if (!this.iframe || !this.iframe.contentWindow) {
            throw new Error("Iframe is not ready. Did you call 'initialize()'?");
        }

        const requestId = this.requestIdCounter++;
        const message: IframeMessage = { requestId, payload };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, resolve);
            this.iframe?.contentWindow?.postMessage(message, window.origin);

            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Request with ID '${requestId}' timed out`));
                }
            }, 10000); // 10-second timeout
        });
    }

    unload(): void {
        document.getElementById(this.iframeId)?.remove();
        window.removeEventListener('message', this.onMessageReceived);
    }
}