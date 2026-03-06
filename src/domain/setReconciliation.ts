export type ReconciliationResult<T> = {
	toAdd: T[];
	toRemove: T[];
};

export function reconcileSets<T>(
	source: Iterable<T>,
	target: Iterable<T>
): ReconciliationResult<T> {
	const sourceSet = new Set(source);
	const targetSet = new Set(target);

	const toAdd: T[] = [];
	const toRemove: T[] = [];

	for (const value of sourceSet) {
		if (!targetSet.has(value)) {
			toAdd.push(value);
		}
	}

	for (const value of targetSet) {
		if (!sourceSet.has(value)) {
			toRemove.push(value);
		}
	}

	return {toAdd, toRemove};
}
