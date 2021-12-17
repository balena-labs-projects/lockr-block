const { exec } = require("child_process");
const lockfile = require("lockfile");
const ms = require("ms");
const { promisify } = require('util');
const lockAsync = promisify(lockfile.lock);
const unlockAsync = promisify(lockfile.unlock);

const command = process.env.COMMAND || "false";
const interval = process.env.INTERVAL || "90s";
const lockPath = process.env.LOCKPATH || "/tmp/balena/updates.lock";

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
  console.debug("creating lockfile...");
  await lockAsync(lockPath)
    .catch((err) => console.error(err))
    .then(() => console.log("lockfile created..."));
}

async function unlock() {
  console.debug("removing lockfile...");
  await unlockAsync(lockPath)
    .catch((err) => console.error(err))
    .then(() => console.log("lockfile removed..."));
}

function sleep(interval) {
  return new Promise((resolve) => setTimeout(resolve, ms(interval)));
}

async function main() {
  while (true) {
    await new Executor()
      .execute(command)
      .then(async (result) => {
        console.debug(`stdout => ${result}`);
        await lock();
      })
      .catch(async (err) => {
        console.error(`stderr => ${err}`);
        await unlock();
      })
      .finally(() => {
        console.log(`next check in ${interval}...`);
        return sleep(interval);
      });
  }
}

main();
