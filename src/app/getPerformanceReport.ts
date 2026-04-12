import { PerformanceMonitor, PerformanceSample } from "../types";

export type GetPerformanceReportUseCase = () => PerformanceSample[];

export function makeGetPerformanceReport(deps: {
	performanceMonitor: PerformanceMonitor;
}): GetPerformanceReportUseCase {
	return function getPerformanceReport(): PerformanceSample[] {
		return deps.performanceMonitor.getReport();
	};
}
