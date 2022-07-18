import { exec } from 'child_process';
import * as lockfile from 'proper-lockfile';
import { schedule } from 'node-cron';

const COMMAND = process.env.COMMAND || 'false';
const SCHEDULE = process.env.SCHEDULE || '*/5 * * * *'; // every 5min
const DEBUG = process.env.DEBUG || false;

// remove the .lock extension as it will be added by the lockfile module
const LOCK_PATH =
	process.env.BALENA_APP_LOCK_PATH?.replace('.lock', '') ||
	'/tmp/balena/updates';

class Executor {
	execute(command: string) {
		return new Promise((resolve, reject) => {
			let logs = '';
			const execution = exec(command);
			execution.stdout?.on('data', (data) => (logs += data));
			execution.stderr?.on('data', (data) => (logs += data));
			execution.on('exit', (code) =>
				code === 0 ? resolve(logs) : reject(logs),
			);
		});
	}
}

const handleCompromised = (err: Error) => {
	console.warn(`lock compromised: ${err}`);
};

async function lock() {
	const options = { realpath: false, onCompromised: handleCompromised };
	await lockfile.check(LOCK_PATH, options).then(async (isLocked: boolean) => {
		if (!isLocked) {
			await lockfile
				.lock(LOCK_PATH, options)
				.catch((err: Error) => console.error(err))
				.then(() => console.log('updates locked...'));
		}
	});
}

async function unlock() {
	const options = { realpath: false, onCompromised: handleCompromised };
	await lockfile.check(LOCK_PATH, options).then(async (isLocked: boolean) => {
		if (isLocked) {
			await lockfile
				.unlock(LOCK_PATH, options)
				.catch((err: Error) => console.error(err))
				.then(() => console.log('updates unlocked...'));
		}
	});
}

async function main() {
	while (true) {
		await new Executor()
			.execute(COMMAND)
			.then(async (result) => {
				if (DEBUG) {
					console.log(`stdout => ${result}`);
				}
				await lock();
			})
			.catch(async (err) => {
				if (DEBUG) {
					console.log(`stderr => ${err}`);
				}
				await unlock();
			});
	}
}

console.log(`Scheduling lock conditions check on cron '${SCHEDULE}'`);
schedule(SCHEDULE, async () => {
	console.log('Checking lock conditions...');
	return main();
});
