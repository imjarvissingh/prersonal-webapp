const { env, assertRuntimeEnv } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { createApp } = require('./app');
const { startRolloverJob, stopRolloverJob } = require('./jobs/rolloverJob');

async function main() {
  assertRuntimeEnv();
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] Dev Tracker API listening on :${env.port} (${env.nodeEnv})`);
  });
  startRolloverJob();

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await stopRolloverJob();
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
