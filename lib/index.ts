import * as lockfile from 'lockfile';
import fetch, { Response } from 'node-fetch';
import ms, { StringValue } from 'ms';
import { promisify } from 'util';

const lockAsync = promisify(lockfile.lock);
const unlockAsync = promisify(lockfile.unlock);
const checkLockAsync = promisify(lockfile.check);

const ENDPOINT: string = process.env.ENDPOINT || '';
const CREDENTIALS = process.env.CREDENTIALS;
const LOCK_REGEXP = process.env.LOCK_REGEXP;
const INTERVAL = process.env.INTERVAL || '60s'; // every 60s
const LOCK_PATH =
	process.env.BALENA_APP_LOCK_PATH || '/tmp/balena/updates.lock';

function isUrl(input: ConstructorParameters<typeof URL>[0]) {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return false;
	}

	return url.protocol === 'http:' || url.protocol === 'https:';
}

if (!isUrl(ENDPOINT)) {
	throw new Error('ENDPOINT must be a valid web URL!');
}

let lockRegexp: RegExp;
try {
	const match = LOCK_REGEXP?.match(new RegExp('^/(.*?)/([gimy]*)$'));
	if (match != null) {
		lockRegexp = new RegExp(match[1], match[2]);
	}
} catch {
	throw new Error('LOCK_REGEX must be a valid regular expression!');
}

async function lock() {
	try {
		const isLocked = await checkLockAsync(LOCK_PATH);

		if (!isLocked) {
			console.log('applying lock...');
			await lockAsync(LOCK_PATH);
			console.log('lock applied!');
		} else {
			console.log('already locked!');
		}
	} catch (err: any) {
		console.error(err.message);
	}
}

async function unlock() {
	try {
		const isLocked = await checkLockAsync(LOCK_PATH);

		if (isLocked) {
			console.log('applying lock...');
			await unlockAsync(LOCK_PATH);
			console.log('lock removed!');
		} else {
			console.log('already unlocked!');
		}
	} catch (err: any) {
		console.error(err.message);
	}
}

class HTTPResponseError extends Error {
	public readonly response: Response;

	constructor(response: Response) {
		super(`HTTP Error Response: ${response.status} ${response.statusText}`);
		this.response = response;
	}
}

const checkStatus = (response: Response) => {
	if (response.ok) {
		// response.status >= 200 && response.status < 300
		return response;
	} else {
		throw new HTTPResponseError(response);
	}
};

const doFetch = async (endpoint: string): Promise<string> => {
	console.log(`GET ${endpoint}`);

	const response = await fetch(endpoint, {
		method: 'GET',
		headers: {
			...(CREDENTIALS != null && {
				Authorization:
					'Basic ' + Buffer.from(CREDENTIALS, 'utf-8').toString('base64'),
			}),
		},
	});
	return checkStatus(response).text();
};

async function doLoop() {
	try {
		const response = await doFetch(ENDPOINT);
		console.log(`=> ${response}`);

		if (lockRegexp.test(response)) {
			return await lock();
		} else {
			return await unlock();
		}
	} catch (err: any) {
		console.error(err.message); // leave locks alone
	} finally {
		setTimeout(doLoop, ms(INTERVAL as StringValue));
	}
}

// doLoop handles all the errors internally so we don't need to worry about awaiting/catching errors
doLoop();
