import {
	NotePerformanceSample,
	PerformanceMonitor,
	PerformancePercentiles,
	PerformanceReport,
	PerformanceSample,
	SchedulerSample,
} from "../../types";

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
	private readonly noteProfiles: NotePerformanceSample[] = [];
	private readonly schedulerSamples: SchedulerSample[] = [];
	private readonly counters = {
		skippedNotes: 0,
		failedNotes: 0,
		failedEmbeddings: 0,
	};

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

	recordNoteProfile(sample: NotePerformanceSample): void {
		this.noteProfiles.push(sample);
	}

	recordSchedulerSample(sample: SchedulerSample): void {
		this.schedulerSamples.push(sample);
	}

	incrementCounter(name: "skippedNotes" | "failedNotes" | "failedEmbeddings", amount = 1): void {
		this.counters[name] += amount;
	}

	getReport(): PerformanceReport {
		const operations: PerformanceSample[] = [...this.samples.entries()]
			.map(([name, sample]) => ({
				name,
				count: sample.count,
				totalMs: sample.totalMs,
				avgMs: sample.totalMs / sample.count,
				maxMs: sample.maxMs,
				lastMs: sample.lastMs,
			}))
			.sort((a, b) => b.totalMs - a.totalMs);

		const noteProfiles = [...this.noteProfiles].sort((a, b) => b.totalMs - a.totalMs);
		const embedMsPercentiles = this.percentiles(
			noteProfiles.filter((profile) => profile.embedCallsPerNote > 0).map((profile) => profile.embedMs),
		);
		const totalMsPercentiles = this.percentiles(
			noteProfiles.filter((profile) => profile.outcome !== "skipped").map((profile) => profile.totalMs),
		);

		const scheduler = {
			runs: this.schedulerSamples.length,
			avgNotesPerSecond: this.average(this.schedulerSamples.map((sample) => sample.notesPerSecond)),
			maxNotesPerSecond: Math.max(0, ...this.schedulerSamples.map((sample) => sample.notesPerSecond)),
			longestBlockMs: Math.max(0, ...this.schedulerSamples.map((sample) => sample.longestBlockMs)),
			longestYieldGapMs: Math.max(0, ...this.schedulerSamples.map((sample) => sample.longestYieldGapMs)),
		};

		return {
			operations,
			noteProfiles,
			embedMsPercentiles,
			totalMsPercentiles,
			scheduler,
			counters: {...this.counters},
		};
	}

	reset(): void {
		this.samples.clear();
		this.noteProfiles.length = 0;
		this.schedulerSamples.length = 0;
		this.counters.skippedNotes = 0;
		this.counters.failedNotes = 0;
		this.counters.failedEmbeddings = 0;
	}

	private average(values: number[]): number {
		if (values.length === 0) return 0;
		return values.reduce((sum, value) => sum + value, 0) / values.length;
	}

	private percentiles(values: number[]): PerformancePercentiles {
		if (values.length === 0) {
			return {p50: 0, p90: 0, p95: 0, p99: 0};
		}

		const sorted = [...values].sort((a, b) => a - b);
		const pick = (percentile: number): number => {
			const index = Math.min(
				sorted.length - 1,
				Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
			);
			return sorted[index];
		};

		return {
			p50: pick(50),
			p90: pick(90),
			p95: pick(95),
			p99: pick(99),
		};
	}
}
