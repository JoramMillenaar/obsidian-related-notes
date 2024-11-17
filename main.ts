import { Plugin, Notice, WorkspaceLeaf, FileSystemAdapter } from 'obsidian';
import { NoteService } from './src/services/noteService';
import { RelatedNotesListView, VIEW_TYPE_RELATED_NOTES } from './src/views/RelatedNotesListView';
import { AppController } from './src/controller';
import { EmbeddingService } from './src/services/embeddingService';
import { MarkdownTextProcessingService } from './src/services/textProcessorService';
import axios from 'axios';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';

interface RelatedNotesSettings {
	numberOfRelatedNotes: number;
	indexDirectory: string;
}

export default class RelatedNotes extends Plugin {
	settings: RelatedNotesSettings;
	private serverProcess: ChildProcess | null = null;

	async onload() {
		this.serverProcess = this.startServer(3000);
		const axiosInstance = axios.create({
			baseURL: 'http://localhost:3000',
			headers: { 'Content-Type': 'application/json' }
		});
		const textProcessor = new MarkdownTextProcessingService();
		const embeddingService = new EmbeddingService(axiosInstance);
		const noteService = new NoteService(this.app);
		const controller = new AppController(noteService, embeddingService, textProcessor);

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, controller)
		);

		this.addRibbonIcon('list-ordered', 'Related Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'related-notes-reindex-all',
			name: 'Related Notes: Refresh relations of all notes',
			callback: () => {
				controller.reindexAll();
			}
		});
		this.addCommand({
			id: 'related-notes-reindex-note',
			name: 'Related Notes: Refresh current note\'s relations',
			callback: () => {
				controller.reindexCurrentActive();
			}
		});
		this.addCommand({
			id: 'related-notes-show-related',
			name: 'Related Notes: Show Related Notes',
			callback: () => { this.activateView() }
		});
	}

	onunload() {
		if (this.serverProcess) {
			this.serverProcess.kill();
			this.serverProcess = null;
			console.log('Server process terminated.');
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES);

		if (leaves.length > 0) {
			leaf = leaves[0];
			// @ts-ignore
			leaf.view.render();
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) { new Notice("Something went wrong"); return }
			await leaf.setViewState({ type: VIEW_TYPE_RELATED_NOTES, active: true });
		}

		workspace.revealLeaf(leaf);
	}

	private startServer(port: number) {
		if (this.app.vault.adapter instanceof FileSystemAdapter) { // true if desktop
			const vaultDir = this.app.vault.adapter.getBasePath()
			const pluginDir = path.join(vaultDir, '.obsidian', 'plugins', 'related-notes');
			const env = { ...process.env };
			env.PATH = `${env.PATH}:/usr/local/bin`;
			
			const serverProcess = spawn('relate-text', ['start-server', '--port', port.toString()], {
				cwd: pluginDir,
				stdio: 'inherit',
				shell: true,
				env
			});

			serverProcess.on('error', (err) => {
				console.error('Failed to start server:', err);
			});

			serverProcess.on('exit', (code) => {
				if (code === 0) {
					console.log('Server exited successfully.');
				} else {
					console.error(`Server exited with code ${code}.`);
				}
			});

			return serverProcess;
		} else {
			new Notice('Mobile not yet supported');
			return null;
		}
	}
}


