import { PerformanceMonitor, PerformanceSample } from "../../types";

type MutableSample = {
	count: number;
	totalMs: number;
	maxMs: number;
	lastMs: number;
};

function now(): number {
	return globalThis.performance?.now?.() ?? Date.now();
}

export class ObsidianPerformanceMonitor implements PerformanceMonitor {
	private readonly samples = new Map<string, MutableSample>();

	async measure<T>(name: string, run: () => Promise<T> | T): Promise<T> {
		const startedAt = now();
		try {
			return await run();
		} finally {
			const durationMs = now() - startedAt;
			const sample = this.samples.get(name) ?? {
				count: 0,
				totalMs: 0,
				maxMs: 0,
				lastMs: 0,
			};
			sample.count += 1;
			sample.totalMs += durationMs;
			sample.maxMs = Math.max(sample.maxMs, durationMs);
			sample.lastMs = durationMs;
			this.samples.set(name, sample);
		}
	}

	getReport(): PerformanceSample[] {
		return [...this.samples.entries()]
			.map(([name, sample]) => ({
				name,
				count: sample.count,
				totalMs: sample.totalMs,
				avgMs: sample.totalMs / sample.count,
				maxMs: sample.maxMs,
				lastMs: sample.lastMs,
			}))
			.sort((a, b) => b.totalMs - a.totalMs);
	}

	reset(): void {
		this.samples.clear();
	}
}
