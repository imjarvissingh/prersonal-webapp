const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoose = require('mongoose');
const { env } = require('./config/env');
const { requireAuth } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Behind nginx on the VPS: trust the first proxy so rate limiting sees real IPs.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Native apps and curl send no Origin header.
        if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
    res.json({ status: 'ok', db: dbState || 'unknown', timezone: env.timezone, time: new Date().toISOString() });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/projects', requireAuth, require('./routes/projects'));
  app.use('/api/milestones', requireAuth, require('./routes/milestones'));
  app.use('/api/tasks', requireAuth, require('./routes/tasks'));
  app.use('/api/ai', requireAuth, require('./routes/ai'));
  app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
