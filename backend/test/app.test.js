const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
const { createApp } = require('../src/app');

const app = createApp();

test('GET /api/health responds without a database', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('protected routes require a bearer token', async () => {
  for (const path of ['/api/projects', '/api/tasks', '/api/dashboard']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401, path);
  }
  const bad = await request(app).get('/api/tasks').set('Authorization', 'Bearer nope');
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error, 'Invalid or expired token');
});

test('register validates input before touching the database', async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'short' });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.details));
});

test('malformed JSON and unknown routes get JSON errors', async () => {
  const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'Malformed JSON body');
  const missing = await request(app).get('/api/nope');
  assert.equal(missing.status, 404);
});
