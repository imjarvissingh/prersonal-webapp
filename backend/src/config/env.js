const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  timezone: process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  rolloverCron: process.env.ROLLOVER_CRON || '0 0 * * *',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};

// Validate the settings the server cannot run without. Called from server.js so
// that unit tests can import modules without a full environment.
function assertRuntimeEnv() {
  required('MONGODB_URI');
  const secret = required('JWT_SECRET');
  if (env.isProduction && (secret.length < 32 || secret.startsWith('change-me'))) {
    throw new Error('JWT_SECRET must be a random string of at least 32 characters in production');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: env.timezone });
  } catch {
    throw new Error(`APP_TIMEZONE "${env.timezone}" is not a valid IANA timezone`);
  }
}

module.exports = { env, assertRuntimeEnv };
