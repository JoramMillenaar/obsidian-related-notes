import { ChildProcess, spawn } from "child_process";

/**
 * Manages a separate server process for embedding services, which cannot run in the main
 * sandboxed Obsidian process due to Node.js API limitations. This class ensures the backend
 * server process operates independently while monitoring the parent Obsidian process.
 *
 * Features:
 * - Initializes and manages the server process that handles embedding services.
 * - Monitors the parent Obsidian process (via PID) and shuts down the server if the parent process terminates unexpectedly.
 * - Ensures safe startup, monitoring, and termination of the server process.
 * 
 * TODO:
 * - Replace HTTP-based communication with a more efficient alternative, such as CLI pipelines or similar, 
 *   to reduce unnecessary dependencies and streamline the implementation.
 */
export class ServerProcessSupervisor {
    private serverProcess: ChildProcess | null;
    private parentPID: number;
    private checkInterval: NodeJS.Timer | null = null;

    constructor() {
        this.parentPID = process.pid;
    }

    startServer(pluginDir: string, port: number): void {
        console.log(`Starting server process...`);
        this.serverProcess = spawn('relate-text', ['start-server', '--port', port.toString()], {
            cwd: pluginDir,
            stdio: ['inherit', 'pipe', 'pipe'], // Attach child process to parent and forward any messages
            shell: true,
            env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` },
        });

		this.serverProcess.stderr?.on('data', (data) => {
			console.error(`[Server Error]: ${data.toString()}`);
		});

        this.serverProcess.stdout?.on('data', (data) => {
            console.log(`[Server]: ${data.toString()}`);
        });

        this.serverProcess.on('error', (err) => {
            console.error('Failed to start server:', err);
        });

        this.serverProcess.on('close', (code) => {
            console.log(`Server process closed with code ${code}`);
            this.stopMonitoring();
        });

        this.startMonitoring();
    }

	private isParentAlive(): boolean {
		try {
			process.kill(this.parentPID, 0); // Misleading method name, but it just checks if the process exists
			return true;
		} catch {
			return false; // Process doesn't exist
		}
	}

    private startMonitoring(): void {
        console.log(`Monitoring parent process with PID: ${this.parentPID}`);
        this.checkInterval = setInterval(() => {
			if (!this.isParentAlive()) {
				console.log(`Parent process (PID: ${this.parentPID}) is no longer running. Shutting down server.`);
				this.terminateServer();
			}
        }, 5000); // Check every 5 seconds
    }

    private stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    terminateServer(): void {
        if (this.serverProcess) {
            console.log('Terminating server process.');
            this.serverProcess.kill('SIGINT');
            this.serverProcess = null;
        }
    }
}
