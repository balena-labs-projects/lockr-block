const { exec } = require("child_process");
const lockfile = require("proper-lockfile");
const ms = require("ms");

const command = process.env.COMMAND || "false";
const interval = process.env.INTERVAL || "90s";
const debug = process.env.DEBUG || false;

// remove the .lock extension as it will be added by the lockfile module
const lockPath =
  process.env.BALENA_APP_LOCK_PATH.replace(".lock", "") ||
  "/tmp/balena/updates";

class Executor {
  execute(command) {
    return new Promise((resolve, reject) => {
      let logs = "";
      const execution = exec(command);
      execution.stdout.on("data", (data) => (logs += data));
      execution.stderr.on("data", (data) => (logs += data));
      execution.on("exit", (code) =>
        code === 0 ? resolve(logs) : reject(logs)
      );
    });
  }
}

const handleCompromised = (err) => {
  console.warn(`lock compromised: ${err}`);
};

async function lock() {
  const options = { realpath: false, onCompromised: handleCompromised };
  await lockfile.check(lockPath, options).then(async (isLocked) => {
    if (!isLocked) {
      await lockfile
        .lock(lockPath, options)
        .catch((err) => console.error(err))
        .then(() => console.log("updates locked..."));
    }
  });
}

async function unlock() {
  const options = { realpath: false, onCompromised: handleCompromised };
  await lockfile.check(lockPath, options).then(async (isLocked) => {
    if (isLocked) {
      await lockfile
        .unlock(lockPath, options)
        .catch((err) => console.error(err))
        .then(() => console.log("updates unlocked..."));
    }
  });
}

function sleep(interval) {
  return new Promise((resolve) => setTimeout(resolve, ms(interval)));
}

async function main() {
  while (true) {
    await new Executor()
      .execute(command)
      .then(async (result) => {
        if (debug) console.log(`stdout => ${result}`);
        await lock();
      })
      .catch(async (err) => {
        if (debug) console.log(`stderr => ${err}`);
        await unlock();
      })
      .finally(() => {
        return sleep(interval);
      });
  }
}

main();
