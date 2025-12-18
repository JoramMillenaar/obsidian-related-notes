import { ComputeEmbedding, GetIndex, GetNoteText, ListNoteIds, SaveIndex } from "../../types";
import { Plugin, TFile } from "obsidian";
import { EmbeddingProvider } from "../../adapters/embedder/embeddingProvider";
import { cleanMarkdownToPlainText } from "../../domain/text";

export async function buildDeps(plugin: Plugin) {
	const embeddingProvider = new EmbeddingProvider();

	const listNoteIds: ListNoteIds = async () =>
		plugin.app.vault.getMarkdownFiles().map(f => f.path);

	const getNoteText: GetNoteText = async (id) => {
		const f = plugin.app.vault.getAbstractFileByPath(id);
		if (!(f instanceof TFile)) throw new Error("Unable to read file");
		const md = await plugin.app.vault.read(f);
		const title = f.basename;
		return cleanMarkdownToPlainText(`${title}\n\n${md}`);
	};

	const getIndex: GetIndex = async () => {
		const data = (await plugin.loadData()) ?? {};
		return Array.isArray(data.index) ? data.index : [];
	};

	const saveIndex: SaveIndex = async (index) => {
		const data = (await plugin.loadData()) ?? {};
		await plugin.saveData({...data, index});
	};

	const computeEmbedding: ComputeEmbedding = async (text: string) => embeddingProvider.embed(text);

	const unload = () => embeddingProvider.unload();

	const load = async () => await embeddingProvider.ready();

	return {listNoteIds, getNoteText, getIndex, saveIndex, computeEmbedding, load, unload};
}
