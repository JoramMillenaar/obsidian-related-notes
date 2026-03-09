/**
 * Generic debouncer that coalesces rapid calls per key.
 * Useful for expensive operations that shouldn't be called repeatedly.
 */
export class KeyedDebouncer<K> {
	private pendingTimers = new Map<K, number>();

	constructor(private delayMs: number) {
	}

	/**
	 * Schedule a callback to run after the delay.
	 * If called again with the same key before the delay expires,
	 * the previous timer is cancelled and a new one starts.
	 */
	schedule(key: K, callback: () => void | Promise<void>): void {
		const existing = this.pendingTimers.get(key);
		if (existing != null) window.clearTimeout(existing);

		const timerId = window.setTimeout(() => {
			this.pendingTimers.delete(key);
			void Promise.resolve(callback());
		}, this.delayMs);

		this.pendingTimers.set(key, timerId);
	}

	/**
	 * Clear all pending timers immediately.
	 * Useful for cleanup on unload.
	 */
	cancel(key?: K): void {
		if (key != null) {
			const timerId = this.pendingTimers.get(key);
			if (timerId != null) {
				window.clearTimeout(timerId);
				this.pendingTimers.delete(key);
			}
		} else {
			this.pendingTimers.forEach((timerId) => window.clearTimeout(timerId));
			this.pendingTimers.clear();
		}
	}
}

