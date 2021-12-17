const { exec } = require("child_process");
const lockfile = require("proper-lockfile");
const ms = require("ms");
const winston = require("winston");

const command = process.env.COMMAND || "false";
const interval = process.env.INTERVAL || "90s";
const lockPath = process.env.LOCKPATH || "/tmp/balena/updates";
const logLevel = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

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
  await lockfile
    .check(lockPath, options)
    .catch((err) => logger.error(err))
    .then(async (isLocked) => {
      if (!isLocked) {
        await lockfile
          .lock(lockPath, options)
          .catch((err) => logger.error(err))
          .then(() => logger.info("updates locked..."));
      }
    });
}

async function unlock() {
  const options = { realpath: false };
  await lockfile
    .check(lockPath, options)
    .catch((err) => logger.error(err))
    .then(async (isLocked) => {
      if (isLocked) {
        await lockfile
          .unlock(lockPath, options)
          .catch((err) => logger.error(err))
          .then(() => logger.info("updates unlocked..."));
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
        logger.debug(`stdout => ${result}`);
        await lock();
      })
      .catch(async (err) => {
        logger.debug(`stderr => ${err}`);
        await unlock();
      })
      .finally(() => {
        logger.debug(`next check in ${interval}...`);
        return sleep(interval);
      });
  }
}

main();
