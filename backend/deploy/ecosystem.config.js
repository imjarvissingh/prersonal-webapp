// PM2 process file for the Ubuntu VPS: `pm2 start deploy/ecosystem.config.js`.
// A single instance on purpose: the midnight rollover cron runs in-process, and
// running several copies would just repeat the same (idempotent) update.
module.exports = {
  apps: [
    {
      name: 'dev-tracker-api',
      script: 'src/server.js',
      cwd: __dirname + '/..',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      kill_timeout: 10000,
      time: true,
    },
  ],
};
