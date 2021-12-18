const { exec } = require("child_process");
const lockfile = require("proper-lockfile");
const ms = require("ms");

const command = process.env.COMMAND || "false";
const interval = process.env.INTERVAL || "90s";
const lockPath = process.env.LOCKPATH || "/tmp/balena/updates";
const debug = process.env.DEBUG || false;

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

async function lock() {
  const options = { realpath: false };
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
  const options = { realpath: false };
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
