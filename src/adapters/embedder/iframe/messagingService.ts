import { IframeMessage } from "../../../types";

export class IframeMessenger {
    private iframe: HTMLIFrameElement | null = null;
    private requestIdCounter = 0;
    private pendingRequests = new Map<number, (data: number[]) => void>();

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

        await this.waitForIframeReady();
    }

    private onMessageReceived = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const { requestId, data, error }: { requestId: number; data: number[]; error?: string } = event.data;
        if (this.pendingRequests.has(requestId)) {
            const resolve = this.pendingRequests.get(requestId);
            this.pendingRequests.delete(requestId);
            if (error) {
                console.error(`Error from iframe: ${error}`);
                return;
            }
            resolve?.(data);
        } else {
            console.warn(`Unrecognized requestId: ${requestId}`);
        }
    };

    async sendMessage(payload: string, retries = 3): Promise<number[]> {
        if (!this.iframe || !this.iframe.contentWindow) {
            throw new Error("Iframe is not ready. Did you call 'initialize()'?");
        }

        const requestId = this.requestIdCounter++;
        const message: IframeMessage = { requestId, payload };

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await new Promise((resolve, reject) => {
                    this.pendingRequests.set(requestId, resolve);
                    this.iframe?.contentWindow?.postMessage(message, window.origin);

                    setTimeout(() => {
                        if (this.pendingRequests.has(requestId)) {
                            this.pendingRequests.delete(requestId);
                            reject(new Error(`Request with ID '${requestId}' timed out`));
                        }
                    }, 10000); // 10-second timeout
                });
            } catch (error) {
                console.warn(`Attempt ${attempt + 1} failed: ${error}`);
            }
        }

        throw new Error(`All ${retries} attempts to send the message failed`);
    }

    private async waitForIframeReady(): Promise<void> {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                await this.ping();
                return;
            } catch (error) {
                console.warn(`Iframe ping attempt ${attempt + 1} failed. Retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            }
        }

        throw new Error("Iframe is not responsive after multiple attempts");
    }

    private ping(): Promise<void> {
        if (!this.iframe || !this.iframe.contentWindow) {
            return Promise.reject(new Error("Iframe is not ready"));
        }

        return new Promise((resolve, reject) => {
            const requestId = this.requestIdCounter++;
            const message: IframeMessage = { requestId, payload: "ping" };

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error("Ping timed out"));
            }, 3000); // 3-second timeout for ping

            this.pendingRequests.set(requestId, () => {
                clearTimeout(timeout);
                resolve();
            });

            this.iframe!.contentWindow!.postMessage(message, window.origin);
        });
    }

    unload(): void {
        document.getElementById(this.iframeId)?.remove();
        window.removeEventListener('message', this.onMessageReceived);
    }
}
