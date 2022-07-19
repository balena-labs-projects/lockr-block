import * as lockfile from 'proper-lockfile';
import fetch from 'node-fetch';
import ms, { StringValue } from 'ms';

const ENDPOINT: string = process.env.ENDPOINT || '';
const CREDENTIALS = process.env.CREDENTIALS;
const LOCK_REGEXP = process.env.LOCK_REGEXP;
const INTERVAL = process.env.INTERVAL || '60s'; // every 60s

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

let lockRegexp: any;
try {
	const match = LOCK_REGEXP?.match(new RegExp('^/(.*?)/([gimy]*)$'));
	if (match != null) {
		lockRegexp = new RegExp(match[1], match[2]);
	}
} catch {
	throw new Error('LOCK_REGEX must be a valid regular expression!');
}

const handleCompromised = (err: Error) => {
	console.log(`lock compromised: ${err}`);
};

async function lock() {
	const options = { realpath: false, onCompromised: handleCompromised };
	return lockfile.check(LOCK_PATH, options).then(async (isLocked: boolean) => {
		if (!isLocked) {
			console.log('applying lock...');
			return lockfile
				.lock(LOCK_PATH, options)
				.then(() => console.log('lock applied!'))
				.catch((err: Error) => console.error(err.message));
		} else {
			console.log('already locked!');
		}
	});
}

async function unlock() {
	const options = { realpath: false, onCompromised: handleCompromised };
	return lockfile.check(LOCK_PATH, options).then(async (isLocked: boolean) => {
		if (isLocked) {
			console.log('removing lock...');
			return lockfile
				.unlock(LOCK_PATH, options)
				.then(() => console.log('lock removed!'))
				.catch((err: Error) => console.error(err.message));
		} else {
			console.log('already unlocked!');
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
	console.log(`GET ${endpoint}`);

	return fetch(endpoint, {
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

async function doLoop() {
	return doFetch(ENDPOINT)
		.then(async (response) => {
			console.log(`=> ${response}`);

			if (lockRegexp.test(response)) {
				return lock();
			} else {
				return unlock();
			}
		})
		.catch((err) => {
			console.error(err.message); // leave locks alone
		})
		.finally(() => {
			setTimeout(doLoop, ms(INTERVAL as StringValue));
		});
}

(async () => {
	try {
		return doLoop();
	} catch (err) {
		console.error(err);
	}
})();
