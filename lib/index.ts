import * as lockfile from 'proper-lockfile';
import { schedule } from 'node-cron';
import fetch from 'node-fetch';

const ENDPOINT: string = process.env.ENDPOINT || '';
const CREDENTIALS = process.env.CREDENTIALS;
const LOCK_REGEX = process.env.LOCK_REGEX;
const SCHEDULE = process.env.SCHEDULE || '*/5 * * * *'; // every 5min

// remove the .lock extension as it will be added by the lockfile module
const LOCK_PATH =
	process.env.BALENA_APP_LOCK_PATH?.replace('.lock', '') ||
	'/tmp/balena/updates';

function isUrl(input: any) {
	let url;
	try {
		url = new URL(input);
	} catch (_) {
		return false;
	}

	return url.protocol === 'http:' || url.protocol === 'https:';
}

if (!isUrl(ENDPOINT)) {
	throw new Error('ENDPOINT must be a valid web URL!');
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

class HTTPResponseError extends Error {
	public readonly response: Response;

	constructor(response: Response) {
		super(`HTTP Error Response: ${response.status} ${response.statusText}`);
		this.response = response;
	}
}

const checkStatus = (response: any) => {
	if (response.ok) {
		// response.status >= 200 && response.status < 300
		return response;
	} else {
		return new HTTPResponseError(response);
	}
};

const doFetch = async (endpoint: string): Promise<any> => {
	return await fetch(endpoint, {
		method: 'GET',
		headers: {
			...(CREDENTIALS != null && {
				Authorization:
					'Basic ' + Buffer.from(CREDENTIALS, 'utf-8').toString('base64'),
			}),
		},
	}).then((response) => {
		return checkStatus(response).text();
	});
};

async function main() {
	await doFetch(ENDPOINT)
		.then(async (response) => {
			console.log(response);

			if (LOCK_REGEX != null) {
				if (new RegExp(LOCK_REGEX).test(response)) {
					return await lock();
				} else {
					return await unlock();
				}
			}
		})
		.catch(async (err) => {
			console.error(err.message);
			// leave locks alone
		});
}

console.log(`Scheduling lock conditions check on cron '${SCHEDULE}'`);
schedule(SCHEDULE, async () => {
	console.log('Checking lock conditions...');
	return main();
});
