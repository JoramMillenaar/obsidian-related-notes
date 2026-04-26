export interface StatusReporter {
	update(text: string, timeout?: number): void;

	clear(): void;
}
