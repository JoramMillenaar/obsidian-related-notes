import { hashText } from "../domain/text";
import { normalizeEmbedding } from "../domain/embedding";
import { isMarkdownPath } from "../domain/markdownPath";
import { EmbeddingPort, IndexRepository, NotePerformanceSample, NoteSource, PerformanceMonitor } from "../types";
import { IsIgnoredPath } from "./isIgnoredPath";

export type IndexNoteDeps = {
	noteSource: NoteSource;
	embedder: EmbeddingPort;
	indexRepo: IndexRepository;
	isIgnoredPath: IsIgnoredPath;
	performanceMonitor: PerformanceMonitor;
};

export type IndexNoteUseCase = (noteId: string) => Promise<void>;

function now(): number {
	return globalThis.performance?.now?.() ?? Date.now();
}

function emptyProfile(noteId: string): NotePerformanceSample {
	return {
		noteId,
		rawChars: 0,
		cleanChars: 0,
		paragraphCount: 0,
		chunkCount: 0,
		embedCallsPerNote: 0,
		avgInputLengthPerCall: 0,
		getTextMs: 0,
		embedMs: 0,
		saveMs: 0,
		totalMs: 0,
		outcome: "indexed",
	};
}

export function makeIndexNote(deps: IndexNoteDeps): IndexNoteUseCase {
	return async function indexNote(noteId: string) {
		const totalStartedAt = now();
		const profile = emptyProfile(noteId);

		try {
			return await deps.performanceMonitor.measure(
				"usecase.indexNote",
				async () => {
					if (!isMarkdownPath(noteId)) {
						profile.outcome = "skipped";
						profile.reason = "non-markdown";
						deps.performanceMonitor.incrementCounter("skippedNotes");
						await deps.indexRepo.remove(noteId);
						return;
					}

					if (await deps.isIgnoredPath(noteId)) {
						profile.outcome = "skipped";
						profile.reason = "ignored";
						deps.performanceMonitor.incrementCounter("skippedNotes");
						await deps.indexRepo.remove(noteId);
						return;
					}

					const textStartedAt = now();
					const textProfile = await deps.noteSource.getTextProfileById(noteId);
					profile.getTextMs = now() - textStartedAt;
					profile.rawChars = textProfile.rawChars;
					profile.cleanChars = textProfile.cleanChars;
					profile.paragraphCount = textProfile.paragraphCount;

					const contentHash = hashText(textProfile.cleanText);

					const existing = await deps.indexRepo.findById(noteId);
					if (existing && existing.contentHash === contentHash) {
						profile.outcome = "skipped";
						profile.reason = "unchanged";
						deps.performanceMonitor.incrementCounter("skippedNotes");
						return;
					}

					profile.chunkCount = textProfile.cleanChars > 0 ? 1 : 0;
					profile.embedCallsPerNote = textProfile.cleanChars > 0 ? 1 : 0;
					profile.avgInputLengthPerCall = textProfile.cleanChars > 0 ? textProfile.cleanChars : 0;

					const embedStartedAt = now();
					const rawEmbedding = await deps.embedder.embed(textProfile.cleanText);
					profile.embedMs = now() - embedStartedAt;
					if (!rawEmbedding?.length) {
						profile.outcome = "failed";
						profile.reason = "empty-embedding";
						deps.performanceMonitor.incrementCounter("failedEmbeddings");
						deps.performanceMonitor.incrementCounter("failedNotes");
						await deps.indexRepo.remove(noteId);
						return;
					}

					const indexedNote = {
						id: noteId,
						embedding: normalizeEmbedding(rawEmbedding),
						contentHash,
						updatedAt: new Date().toISOString(),
					};

					const saveStartedAt = now();
					await deps.indexRepo.upsert(indexedNote);
					profile.saveMs = now() - saveStartedAt;
				},
			);
		} catch (error) {
			profile.outcome = "failed";
			profile.reason = "error";
			deps.performanceMonitor.incrementCounter("failedNotes");
			throw error;
		} finally {
			profile.totalMs = now() - totalStartedAt;
			deps.performanceMonitor.recordNoteProfile(profile);
		}
	};
}
