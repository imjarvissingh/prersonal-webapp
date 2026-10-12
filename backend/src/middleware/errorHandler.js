const mongoose = require('mongoose');
const { env } = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    message = details[0]?.message || 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with that value already exists';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (env.isProduction) message = 'Internal server error';
  }

  res.status(status).json({ error: message, ...(details ? { details } : {}) });
}

module.exports = { notFoundHandler, errorHandler };
