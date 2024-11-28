import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { logError } from "./services/utils";
import { Notice } from "obsidian";


/**
 * Manages a separate server process for embedding services, which cannot run in the main
 * sandboxed Obsidian process due to Node.js API limitations. This class ensures the backend
 * server process operates independently while monitoring the parent Obsidian process.
 *
 * Features:
 * - Initializes and manages the server process that handles embedding services.
 * - Monitors the parent Obsidian process (via PID) and shuts down the server if the parent process terminates unexpectedly.
 * - Ensures safe startup, monitoring, and termination of the server process.
 * - Saves the server PID in case we lose the reference to the serverProcess, we can fallback to use the now detached process
 */
export class ServerProcessSupervisor {
	private serverProcess: ChildProcess | null = null;
	private stateFilePath: string;
	private port: number | null = null;

	constructor(private pluginDir: string) {
		this.pluginDir = pluginDir;
		this.stateFilePath = path.join(pluginDir, ".server.json");
	}

	isServerRunning(): boolean {
		return !!(this.serverProcess || this.getRunningProcess());
	}

	async startNewServer(port: number): Promise<void> {
		return new Promise((resolve, reject) => {
			this.serverProcess = spawn("relate-text", ["start-server", "--port", port.toString()], {
				cwd: this.pluginDir,
				stdio: ["inherit", "pipe", "pipe"], // Attach child process to parent and forward any messages
				shell: true,
				env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` },
			});

			this.writeStateToFile({ pid: this.serverProcess.pid, port });
			console.log('Ran server on: ', port, this.serverProcess.pid)

			this.serverProcess.stderr?.on("data", (chunk) => {
				const errorMessage = chunk.toString().trim();
				logError(`[Server Error]: ${errorMessage}`);

				if (errorMessage.includes("EADDRINUSE")) {
					new Notice(
						`[Related Notes] Port ${port} is already in use.\nPlease set a different value in the settings.`
					);
					reject(new Error(`Port ${port} is already in use.`));
				}
			});

			this.serverProcess.stdout?.on("data", (data) => {
				const output = data.toString();
				if (output.includes("Listening on")) {
					resolve();
				}
			});

			this.serverProcess.on("error", (err) => {
				logError("Failed to start server:", err);
				reject(err);
			});

			this.serverProcess.on("close", (code) => {
				this.cleanupStateFile();
			});
		});
	}

	terminateServer(): void {
		if (this.serverProcess && !this.serverProcess.killed) {
			this.serverProcess.kill("SIGINT");
			this.serverProcess = null;
			return;
		}
		const serverState = this.readStateFromFile();
		if (serverState?.pid) {
			process.kill(serverState.pid);
		}
		this.cleanupStateFile();
	}

	getServerPort(): number {
		if (this.port) return this.port;

		const state = this.readStateFromFile();
		if (state?.port) {
			return (this.port = state.port);
		}

		throw new Error("Cannot retrieve port of the server. Has the server started?");
	}

	private writeStateToFile(state: { pid: number | undefined; port: number }): void {
		try {
			fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
		} catch (err) {
			logError(`Failed to write state to file: ${err}`);
		}
	}

	private readStateFromFile(): { pid: number | null; port: number | null } | null {
		try {
			if (fs.existsSync(this.stateFilePath)) {
				const data = fs.readFileSync(this.stateFilePath, "utf-8");
				return JSON.parse(data);
			}
		} catch (err) {
			logError(`Failed to read state from file: ${err}`);
		}
		return null;
	}

	private isProcessRunning(pid: number): boolean {
		try {
			process.kill(pid, 0); // Check if the process exists
			return true;
		} catch {
			return false;
		}
	}

	private getRunningProcess(): number | null {
		const state = this.readStateFromFile();
		if (state?.pid && this.isProcessRunning(state.pid)) {
			return state.pid;
		}
		this.cleanupStateFile(); // Remove stale state file
		return null;
	}

	private cleanupStateFile(): void {
		try {
			if (fs.existsSync(this.stateFilePath)) {
				fs.unlinkSync(this.stateFilePath);
			}
		} catch (err) {
			logError(`Failed to clean up state file: ${err}`);
		}
	}
}
