import { PerformanceMonitor } from "../types";

export type ResetPerformanceReportUseCase = () => void;

export function makeResetPerformanceReport(deps: {
	performanceMonitor: PerformanceMonitor;
}): ResetPerformanceReportUseCase {
	return function resetPerformanceReport(): void {
		deps.performanceMonitor.reset();
	};
}
