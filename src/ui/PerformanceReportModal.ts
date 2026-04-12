import { App, Modal } from "obsidian";
import { GetPerformanceReportUseCase } from "../app/getPerformanceReport";

export class PerformanceReportModal extends Modal {
	constructor(
		app: App,
		private readonly getPerformanceReport: GetPerformanceReportUseCase,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle("Performance report");
		this.contentEl.empty();

		const report = this.getPerformanceReport();
		if (report.operations.length === 0 && report.noteProfiles.length === 0) {
			this.contentEl.createEl("p", {
				text: "No performance samples yet. Run sync, search, or note indexing first.",
			});
			return;
		}

		const profileWithEmbeds = report.noteProfiles.filter((profile) => profile.embedCallsPerNote > 0);
		const avgEmbedCallsPerNote = profileWithEmbeds.length > 0
			? profileWithEmbeds.reduce((sum, profile) => sum + profile.embedCallsPerNote, 0) / profileWithEmbeds.length
			: 0;
		const avgInputLengthPerCall = profileWithEmbeds.length > 0
			? profileWithEmbeds.reduce((sum, profile) => sum + profile.avgInputLengthPerCall, 0) / profileWithEmbeds.length
			: 0;

		const summary = this.contentEl.createEl("div", {cls: "related-notes-performance-summary"});
		summary.createEl("p", {
			text: `Skipped notes: ${report.counters.skippedNotes} | Failed notes: ${report.counters.failedNotes} | Failed embeddings: ${report.counters.failedEmbeddings}`,
		});
		summary.createEl("p", {
			text: `Embed ms percentiles: p50 ${report.embedMsPercentiles.p50.toFixed(1)} | p90 ${report.embedMsPercentiles.p90.toFixed(1)} | p95 ${report.embedMsPercentiles.p95.toFixed(1)} | p99 ${report.embedMsPercentiles.p99.toFixed(1)}`,
		});
		summary.createEl("p", {
			text: `Total ms percentiles: p50 ${report.totalMsPercentiles.p50.toFixed(1)} | p90 ${report.totalMsPercentiles.p90.toFixed(1)} | p95 ${report.totalMsPercentiles.p95.toFixed(1)} | p99 ${report.totalMsPercentiles.p99.toFixed(1)}`,
		});
		summary.createEl("p", {
			text: `Scheduler: ${report.scheduler.runs} run(s) | avg ${report.scheduler.avgNotesPerSecond.toFixed(1)} notes/s | max ${report.scheduler.maxNotesPerSecond.toFixed(1)} notes/s | longest block ${report.scheduler.longestBlockMs.toFixed(1)} ms | longest yield gap ${report.scheduler.longestYieldGapMs.toFixed(1)} ms`,
		});
		summary.createEl("p", {
			text: `Embed shape: avg calls/note ${avgEmbedCallsPerNote.toFixed(1)} | avg input chars/call ${avgInputLengthPerCall.toFixed(1)}`,
		});

		this.contentEl.createEl("h3", {text: "Operations"});
		const table = this.contentEl.createEl("table", {cls: "related-notes-performance-report"});
		const headerRow = table.createEl("thead").createEl("tr");
		["Operation", "Calls", "Total ms", "Avg ms", "Max ms", "Last ms"].forEach((label) => {
			headerRow.createEl("th", {text: label});
		});

		const body = table.createEl("tbody");
		report.operations.forEach((sample) => {
			const row = body.createEl("tr");
			row.createEl("td", {text: sample.name});
			row.createEl("td", {text: String(sample.count)});
			row.createEl("td", {text: sample.totalMs.toFixed(1)});
			row.createEl("td", {text: sample.avgMs.toFixed(1)});
			row.createEl("td", {text: sample.maxMs.toFixed(1)});
			row.createEl("td", {text: sample.lastMs.toFixed(1)});
		});

		this.contentEl.createEl("h3", {text: "Slowest notes"});
		const notesTable = this.contentEl.createEl("table", {cls: "related-notes-performance-report"});
		const notesHeaderRow = notesTable.createEl("thead").createEl("tr");
		["Note", "Outcome", "Total", "Embed", "Get text", "Save", "Raw chars", "Clean chars", "Paragraphs", "Chunks", "Embed calls", "Avg input/call"].forEach((label) => {
			notesHeaderRow.createEl("th", {text: label});
		});

		const notesBody = notesTable.createEl("tbody");
		report.noteProfiles.slice(0, 15).forEach((profile) => {
			const row = notesBody.createEl("tr");
			row.createEl("td", {text: profile.noteId});
			row.createEl("td", {text: profile.reason ? `${profile.outcome} (${profile.reason})` : profile.outcome});
			row.createEl("td", {text: profile.totalMs.toFixed(1)});
			row.createEl("td", {text: profile.embedMs.toFixed(1)});
			row.createEl("td", {text: profile.getTextMs.toFixed(1)});
			row.createEl("td", {text: profile.saveMs.toFixed(1)});
			row.createEl("td", {text: String(profile.rawChars)});
			row.createEl("td", {text: String(profile.cleanChars)});
			row.createEl("td", {text: String(profile.paragraphCount)});
			row.createEl("td", {text: String(profile.chunkCount)});
			row.createEl("td", {text: String(profile.embedCallsPerNote)});
			row.createEl("td", {text: profile.avgInputLengthPerCall.toFixed(1)});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
