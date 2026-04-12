import { makeEmbedText } from "./embedText";
import { makeExecuteSyncActions } from "./executeSyncActions";
import { makeGetSyncActions } from "./getSyncActions";
import { makeIndexNote } from "./indexNote";
import { makeSyncIndexToVault } from "./syncIndexToVault";
import {
	EmbeddingChunkConfig,
	EmbeddingPort,
	IndexRepository,
	NoteSource,
	PerformanceMonitor,
	PerformanceReport,
	SettingsRepository,
} from "../types";
import { IsIgnoredPath } from "./isIgnoredPath";

export type ChunkingBenchmarkResult = {
	config: EmbeddingChunkConfig;
	averageTotalIndexMs: number;
	averageP50NoteMs: number;
	averageP95NoteMs: number;
	runs: Array<{
		totalIndexMs: number;
		p50NoteMs: number;
		p95NoteMs: number;
	}>;
};

export type RunChunkingBenchmarkUseCase = () => Promise<{
	results: ChunkingBenchmarkResult[];
	markdown: string;
}>;

type BenchmarkRunRecord = {
	totalIndexMs: number;
	p50NoteMs: number;
	p95NoteMs: number;
};

const BENCHMARK_CONFIGS: EmbeddingChunkConfig[] = [
	{windowSize: 128, overlap: 32},
	{windowSize: 200, overlap: 56},
	{windowSize: 256, overlap: 32},
	{windowSize: 300, overlap: 50},
	{windowSize: 400, overlap: 50},
];

const RUNS_PER_CONFIG = 5;

function average(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function now(): number {
	return globalThis.performance?.now?.() ?? Date.now();
}

function formatConfig(config: EmbeddingChunkConfig): string {
	return `${config.windowSize} / ${config.overlap}`;
}

function buildMarkdown(results: ChunkingBenchmarkResult[]): string {
	const labels = results.map((result) => `"${formatConfig(result.config)}"`).join(", ");
	const totalSeries = results.map((result) => Number(result.averageTotalIndexMs.toFixed(1))).join(", ");
	const p50Series = results.map((result) => Number(result.averageP50NoteMs.toFixed(1))).join(", ");
	const p95Series = results.map((result) => Number(result.averageP95NoteMs.toFixed(1))).join(", ");
	const maxY = Math.max(
		1,
		...results.flatMap((result) => [
			result.averageTotalIndexMs,
			result.averageP50NoteMs,
			result.averageP95NoteMs,
		]),
	);

	const detailRows = results.map((result) => {
		const runSummary = result.runs
			.map((run, index) => `run ${index + 1}: total ${run.totalIndexMs.toFixed(1)} ms, p50 ${run.p50NoteMs.toFixed(1)} ms, p95 ${run.p95NoteMs.toFixed(1)} ms`)
			.join("; ");
		return `| ${formatConfig(result.config)} | ${result.averageTotalIndexMs.toFixed(1)} | ${result.averageP50NoteMs.toFixed(1)} | ${result.averageP95NoteMs.toFixed(1)} | ${runSummary} |`;
	}).join("\n");

	return [
		"# Related Notes chunking benchmark",
		"",
		`Average of ${RUNS_PER_CONFIG} full sync runs per configuration.`,
		"",
		"```mermaid",
		"xychart-beta",
		'    title "Chunking benchmark"',
		`    x-axis [${labels}]`,
		`    y-axis "Milliseconds" 0 --> ${Math.ceil(maxY * 1.1)}`,
		`    bar "Total index ms" [${totalSeries}]`,
		`    bar "p50 note total ms" [${p50Series}]`,
		`    bar "p95 note total ms" [${p95Series}]`,
		"```",
		"",
		"| Config | Avg total index ms | Avg p50 note ms | Avg p95 note ms | Runs |",
		"| --- | ---: | ---: | ---: | --- |",
		detailRows,
		"",
	].join("\n");
}

function benchmarkNotePath(): string {
	return "Related Notes Chunking Benchmark.md";
}

export function makeRunChunkingBenchmark(deps: {
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
	noteSource: NoteSource;
	settingsRepo: SettingsRepository;
	isIgnoredPath: IsIgnoredPath;
	createPerformanceMonitor: () => PerformanceMonitor;
}): RunChunkingBenchmarkUseCase {
	return async function runChunkingBenchmark() {
		console.log("Running chunking benchmark");
		const originalIndex = await deps.indexRepo.listAll();
		const results: ChunkingBenchmarkResult[] = [];

		try {
			for (const config of BENCHMARK_CONFIGS) {
				console.log("running config", config);
				const runs: BenchmarkRunRecord[] = [];

				for (let runIndex = 0; runIndex < RUNS_PER_CONFIG; runIndex++) {
					console.log("running config", runIndex);
					const performanceMonitor = deps.createPerformanceMonitor();
					const embedText = makeEmbedText({
						embedder: deps.embedder,
						getChunkConfig: () => config,
					});
					const indexNote = makeIndexNote({
						noteSource: deps.noteSource,
						embedText,
						indexRepo: deps.indexRepo,
						isIgnoredPath: deps.isIgnoredPath,
						performanceMonitor,
						getChunkConfig: () => config,
					});
					const getSyncActions = makeGetSyncActions({
						noteSource: deps.noteSource,
						indexRepo: deps.indexRepo,
						settingsRepo: deps.settingsRepo,
						performanceMonitor,
					});
					const executeSyncActions = makeExecuteSyncActions({
						indexNote,
						indexRepo: deps.indexRepo,
						performanceMonitor,
					});
					const syncIndexToVault = makeSyncIndexToVault({
						getSyncActions,
						executeSyncActions,
						performanceMonitor,
					});

					await deps.indexRepo.clear();
					const startedAt = now();
					await syncIndexToVault();
					const totalIndexMs = now() - startedAt;
					const report: PerformanceReport = performanceMonitor.getReport();

					runs.push({
						totalIndexMs,
						p50NoteMs: report.totalMsPercentiles.p50,
						p95NoteMs: report.totalMsPercentiles.p95,
					});
				}

				results.push({
					config,
					averageTotalIndexMs: average(runs.map((run) => run.totalIndexMs)),
					averageP50NoteMs: average(runs.map((run) => run.p50NoteMs)),
					averageP95NoteMs: average(runs.map((run) => run.p95NoteMs)),
					runs,
				});
			}

			return {
				results,
				markdown: buildMarkdown(results),
			};
		} finally {
			await deps.indexRepo.clear();
			if (originalIndex.length > 0) {
				await deps.indexRepo.upsertMany(originalIndex);
			}
		}
	};
}

export { benchmarkNotePath };
