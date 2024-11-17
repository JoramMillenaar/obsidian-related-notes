import { Plugin, FileSystemAdapter, Notice } from 'obsidian';
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
	private controller: AppController | null = null;

	async onload() {
		this.serverProcess = await this.startServer(3000);

		const axiosInstance = axios.create({
			baseURL: 'http://localhost:3000',
			headers: { 'Content-Type': 'application/json' }
		});
		const textProcessor = new MarkdownTextProcessingService();
		const embeddingService = new EmbeddingService(axiosInstance);
		const noteService = new NoteService(this.app);
		this.controller = new AppController(noteService, embeddingService, textProcessor);

		this.controller.reindexAll();

		this.registerView(
			VIEW_TYPE_RELATED_NOTES,
			(leaf) => new RelatedNotesListView(leaf, this.controller)
		);

		this.addRibbonIcon('list-ordered', 'Related Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'related-notes-reindex-all',
			name: 'Related Notes: Refresh relations of all notes',
			callback: () => {
				this.controller?.reindexAll();
			}
		});
		this.addCommand({
			id: 'related-notes-reindex-note',
			name: 'Related Notes: Refresh current note\'s relations',
			callback: () => {
				this.controller?.reindexCurrentActive();
			}
		});
		this.addCommand({
			id: 'related-notes-show-related',
			name: 'Related Notes: Show Related Notes',
			callback: () => {
				this.activateView();
			}
		});

		// Listen for active file changes
		this.app.workspace.on('active-leaf-change', () => {
			this.updateRelatedNotesView();
		});

		// Ensure the view is present in the sidebar on load
		this.app.workspace.onLayoutReady(() => {
			this.ensureRelatedNotesView();
		});
	}

	onunload() {
		if (this.serverProcess) {
			this.serverProcess.kill();
			this.serverProcess = null;
			console.log('Server process terminated.');
		}

		this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES).forEach((leaf) => leaf.detach());
	}

	private ensureRelatedNotesView() {
		if (!this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES).length) {
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				leaf.setViewState({
					type: VIEW_TYPE_RELATED_NOTES,
					active: true,
				});
			}
		}
	}

	private updateRelatedNotesView() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;

		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES);
		if (leaves.length) {
			const view = leaves[0].view as RelatedNotesListView;
			view.refresh();
		}
	}

	private async activateView() {
		let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RELATED_NOTES)[0];
	
		if (!leaf) {
			const newLeaf = this.app.workspace.getRightLeaf(true);
			if (!newLeaf) {
				new Notice('Unable to activate the Related Notes view.');
				return;
			}
	
			leaf = newLeaf;
			await leaf.setViewState({ type: VIEW_TYPE_RELATED_NOTES, active: true });
		}
		this.app.workspace.revealLeaf(leaf);
	}
	


	private async startServer(port: number): Promise<ChildProcess> {
		if (this.app.vault.adapter instanceof FileSystemAdapter) { // true if desktop
			const vaultDir = this.app.vault.adapter.getBasePath();
			const pluginDir = path.join(vaultDir, '.obsidian', 'plugins', 'related-notes');
			const env = { ...process.env };
			env.PATH = `${env.PATH}:/usr/local/bin`;

			return new Promise((resolve, reject) => {
				const serverProcess = spawn('relate-text', ['start-server', '--port', port.toString()], {
					cwd: pluginDir,
					stdio: ['pipe', 'pipe', 'inherit'], // Capture stdout
					shell: true,
					env
				});

				serverProcess.stdout.on('data', (data) => {
					const message = data.toString();
					console.log(`Server stdout: ${message}`);

					if (message.includes('Listening on')) {
						console.log('Server is ready!');
						resolve(serverProcess);
					}
				});

				serverProcess.on('error', (err) => {
					console.error('Failed to start server:', err);
					reject(err);
				});

				serverProcess.on('exit', (code) => {
					if (code !== 0) {
						reject(new Error(`Server exited with code ${code}`));
					}
				});
			});
		} else {
			throw new Error('Mobile environment not supported');
		}
	}
}
