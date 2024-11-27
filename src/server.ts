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
	private pidFilePath: string;

	constructor(private pluginDir: string) {
		this.pluginDir = pluginDir;
		this.pidFilePath = path.join(pluginDir, ".server.pid");
	}

	async ensureServerRunning(port: number): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.serverProcess || this.getRunningProcess()) {
				resolve();
				return;
			}

			this.serverProcess = spawn("relate-text", ["start-server", "--port", port.toString()], {
				cwd: this.pluginDir,
				stdio: ["inherit", "pipe", "pipe"], // Attach child process to parent and forward any messages
				shell: true,
				env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` },
			});

			this.writePIDToFile(this.serverProcess.pid);

			this.serverProcess.stderr?.on("data", (chunk) => {
				const errorMessage = chunk.toString().trim();
				logError(`[Server Error]: ${errorMessage}`);
			
				if (errorMessage.includes("EADDRINUSE")) {
					new Notice(
						`[Related Notes] Port ${port} is already in use.\nPlease set a different value in the settings.`
					);
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
			});

			this.serverProcess.on("close", (code) => {
				this.cleanupPIDFile();
			});
		})
	}

	terminateServer(): void {
		if (this.serverProcess && !this.serverProcess.killed) {
			this.serverProcess.kill("SIGINT");
			this.serverProcess = null;
			return;
		}
		const serverPID = this.getRunningProcess();
		if (serverPID) {
			process.kill(serverPID);
		}
		this.cleanupPIDFile();
	}

	private writePIDToFile(pid: number | undefined): void {
		if (pid) {
			try {
				fs.writeFileSync(this.pidFilePath, pid.toString());
			} catch (err) {
				logError(`Failed to write PID to file: ${err}`);
			}
		}
	}

	private readPIDFromFile(): number | null {
		try {
			if (fs.existsSync(this.pidFilePath)) {
				const pid = parseInt(fs.readFileSync(this.pidFilePath, "utf-8"), 10);
				return isNaN(pid) ? null : pid;
			}
		} catch (err) {
			logError(`Failed to read PID from file: ${err}`);
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
		const pid = this.readPIDFromFile();
		if (pid && this.isProcessRunning(pid)) {
			return pid;
		}
		this.cleanupPIDFile(); // Remove stale PID file
		return null;
	}

	private cleanupPIDFile(): void {
		try {
			if (fs.existsSync(this.pidFilePath)) {
				fs.unlinkSync(this.pidFilePath);
			}
		} catch (err) {
			logError(`Failed to clean up PID file: ${err}`);
		}
	}
}
