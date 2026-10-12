const cron = require('node-cron');
const { env } = require('../config/env');
const { rolloverTasks } = require('../services/rollover');

let task = null;

async function runRollover(reason) {
  try {
    const { today, rolledOver } = await rolloverTasks();
    console.log(`[rollover] ${reason}: moved ${rolledOver} unfinished task(s) to ${today}`);
  } catch (err) {
    console.error('[rollover] failed', err);
  }
}

// Schedules the midnight rollover in APP_TIMEZONE and runs a catch-up pass at
// boot so a server that was down at midnight still rolls tasks forward.
function startRolloverJob() {
  if (!cron.validate(env.rolloverCron)) {
    throw new Error(`ROLLOVER_CRON "${env.rolloverCron}" is not a valid cron expression`);
  }
  task = cron.schedule(env.rolloverCron, () => runRollover('scheduled'), {
    timezone: env.timezone,
    name: 'task-rollover',
    noOverlap: true,
  });
  console.log(`[rollover] scheduled "${env.rolloverCron}" in ${env.timezone}`);
  runRollover('startup catch-up');
  return task;
}

async function stopRolloverJob() {
  if (task) {
    await task.stop();
    task = null;
  }
}

module.exports = { startRolloverJob, stopRolloverJob, runRollover };
