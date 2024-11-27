const [parentPID, childPID] = process.argv.slice(2).map(Number);

setInterval(() => {
	let parentAlive = true;
	let childAlive = true;

	// Check if the parent process is still running
	try {
		process.kill(parentPID, 0);
	} catch {
		console.log("Parent process terminated. Killing child process...");
		parentAlive = false;
	}

	// Check if the child process is still running
	try {
		process.kill(childPID, 0);
	} catch {
		console.log("Child process terminated. Exiting monitor process...");
		childAlive = false;
	}

	// If either process is not alive, clean up
	if (!parentAlive) {
		try { process.kill(childPID, "SIGINT"); } catch { console.log('monitor error') }
	}

	if (!parentAlive || !childAlive) {
		process.exit();
	}
}, 5000); // Check every 5 seconds

