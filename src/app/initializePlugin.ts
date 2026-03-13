import { Plugin, TFile } from "obsidian";
import { SimilarNotesListView, VIEW_TYPE_SIMILARITY } from "../ui/SimilarNotesListView";
import { AppServices } from "./buildAppServices";
import { activateRightLeafView } from "./activateRightLeafView";

export async function initializePlugin(
	plugin: Plugin,
	app: AppServices,
): Promise<void> {
	app.status.update("Starting…");

	try {
		await app.embedder.load();

		const isEmpty = await app.indexRepo.isEmpty();
		if (!isEmpty) {
			app.status.update("Repairing index…");
			try {
				await app.syncIndexToVault({
					onProgress: (p) => {
						app.status.update(`${p.processed}/${p.total} indexed`);
					},
				});
			} catch (error) {
				console.error("[Similarity] Index repair failed", error);
			}
		}

		app.status.update("Ready", 1500);
	} catch (error) {
		app.status.update("Failed to start (see console)", 8000);
		console.error("[Similarity] start() failed", error);
	}

	plugin.registerEvent(
		plugin.app.workspace.on("editor-change", (_editor, info) => {
			const file = info.file;
			if (!(file instanceof TFile)) return;

			app.upsertDebouncer.schedule(file.path, async () => {
				await app.indexNote(file.path).catch((error) => {
					console.error("[Similarity] Reindex failed", error);
				});
			});
		}),
	);

	plugin.registerEvent(
		plugin.app.vault.on("delete", (file) => {
			if (!(file instanceof TFile)) return;

			void app.indexRepo.remove(file.path).catch((error) => {
				console.error("[Similarity] Delete from index failed", error);
			});

			app.status.update("Note removed from index", 1500);
		}),
	);

	plugin.registerEvent(
		plugin.app.vault.on("rename", (file, oldPath) => {
			if (!(file instanceof TFile)) return;

			void app.indexRepo.rename(oldPath, file.path).catch((error) => {
				console.error("[Similarity] Rename note failed", error);
			});

			void app.indexNote(file.path).catch((error) => {
				console.error("[Similarity] Reindex after rename failed", error);
			});

			app.status.update("Index updated (rename)", 1500);
		}),
	);

	plugin.registerEvent(
		plugin.app.workspace.on("file-open", () => {
			const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_SIMILARITY).first();
			if (leaf && leaf.view instanceof SimilarNotesListView) {
				void leaf.view.refresh();
			}
		}),
	);

	await activateRightLeafView(plugin);
}
