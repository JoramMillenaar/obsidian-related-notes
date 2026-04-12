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
		if (report.length === 0) {
			this.contentEl.createEl("p", {
				text: "No performance samples yet. Run sync, search, or note indexing first.",
			});
			return;
		}

		const table = this.contentEl.createEl("table", {cls: "related-notes-performance-report"});
		const headerRow = table.createEl("thead").createEl("tr");
		["Operation", "Calls", "Total ms", "Avg ms", "Max ms", "Last ms"].forEach((label) => {
			headerRow.createEl("th", {text: label});
		});

		const body = table.createEl("tbody");
		report.forEach((sample) => {
			const row = body.createEl("tr");
			row.createEl("td", {text: sample.name});
			row.createEl("td", {text: String(sample.count)});
			row.createEl("td", {text: sample.totalMs.toFixed(1)});
			row.createEl("td", {text: sample.avgMs.toFixed(1)});
			row.createEl("td", {text: sample.maxMs.toFixed(1)});
			row.createEl("td", {text: sample.lastMs.toFixed(1)});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
