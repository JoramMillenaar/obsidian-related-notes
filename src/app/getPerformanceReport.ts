import { PerformanceMonitor, PerformanceReport } from "../types";

export type GetPerformanceReportUseCase = () => PerformanceReport;

export function makeGetPerformanceReport(deps: {
	performanceMonitor: PerformanceMonitor;
}): GetPerformanceReportUseCase {
	return function getPerformanceReport(): PerformanceReport {
		return deps.performanceMonitor.getReport();
	};
}
