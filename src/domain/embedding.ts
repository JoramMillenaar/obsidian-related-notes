import { Embedding } from "../types";

export function normalizeEmbedding(embedding: Embedding): Embedding {
	const v = embedding as unknown as number[];

	let sumSq = 0;
	for (let i = 0; i < v.length; i++) {
		const x = v[i];
		sumSq += x * x;
	}

	if (sumSq === 0) return v.slice() as unknown as Embedding;

	const invNorm = 1 / Math.sqrt(sumSq);
	const out = new Array<number>(v.length);
	for (let i = 0; i < v.length; i++) {
		out[i] = v[i] * invNorm;
	}
	return out as unknown as Embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error(`cosineSimilarity: length mismatch (${a.length} vs ${b.length})`);
	}

	let dot = 0;
	let aSq = 0;
	let bSq = 0;

	for (let i = 0; i < a.length; i++) {
		const x = a[i];
		const y = b[i];
		dot += x * y;
		aSq += x * x;
		bSq += y * y;
	}

	const denom = Math.sqrt(aSq) * Math.sqrt(bSq);
	if (denom === 0) return 0;

	return dot / denom;
}
