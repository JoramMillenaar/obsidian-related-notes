import { deriveSyncActions } from "../domain/getSyncActions";
import { isPathIgnored } from "../domain/ignoreRules";
import { IndexRepository, NoteSource, SettingsRepository } from "../ports";
import { sortInitialIndexCandidates } from "../domain/indexingQueue";

export type IndexSyncPlan = {
	idsToRemoveFromIndex: string[];
	idsToRemoveFromQueue: string[];
	idsToSeed: string[];
};

export type BuildIndexSyncPlanUseCase = (args: {
	queuedIds: string[];
	forceReindexAll?: boolean;
}) => Promise<IndexSyncPlan>;

export function makeBuildIndexSyncPlan(deps: {
	noteSource: NoteSource;
	indexRepo: IndexRepository;
	settingsRepo: SettingsRepository;
}): BuildIndexSyncPlanUseCase {
	return async function buildIndexSyncPlan(args) {
		const settings = await deps.settingsRepo.get();
		const allCandidates = deps.noteSource.listIndexCandidates();
		const candidates = allCandidates.filter(
			(candidate) => !isPathIgnored(candidate.id, settings.ignoredPaths),
		);
		const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
		const index = await deps.indexRepo.listAll();
		const indexedIds = index.map((entry) => entry.id);
		const actions = deriveSyncActions(
			candidates.map((candidate) => candidate.id),
			indexedIds,
		);
		const validIds = new Set(candidates.map((candidate) => candidate.id));
		const idsToSeed = args.forceReindexAll
			? sortInitialIndexCandidates(candidates)
			: sortInitialIndexCandidates(
				[...new Set(actions.toAdd)]
					.map((noteId) => candidateMap.get(noteId))
					.filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)),
			);

		return {
			idsToRemoveFromIndex: [...new Set(actions.toRemove)],
			idsToRemoveFromQueue: [...new Set(args.queuedIds.filter((id) => !validIds.has(id)))],
			idsToSeed,
		};
	};
}
