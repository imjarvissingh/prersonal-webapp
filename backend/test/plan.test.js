const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePlan } = require('../src/services/gemini');
const { scheduleMilestones } = require('../src/services/scaffold');

const raw = {
  title: 'Launch blog',
  description: 'Ship a personal blog',
  milestones: [
    { title: 'Design', durationDays: 5, tasks: [{ title: 'Sketch layout', priority: 'high', energy: 'high', estimateMinutes: 90 }] },
    { title: 'Build', durationDays: 10, tasks: [{ title: 'Write posts', priority: 'medium', energy: 'low', estimateMinutes: 60 }] },
  ],
};

test('parsePlan accepts fenced JSON and fills defaults', () => {
  const plan = parsePlan('```json\n' + JSON.stringify(raw) + '\n```');
  assert.equal(plan.milestones.length, 2);
  assert.equal(plan.milestones[0].tasks[0].notes, '');
  assert.equal(plan.milestones[0].description, '');
});

test('parsePlan rejects malformed output', () => {
  assert.throws(() => parsePlan('not json'), /not valid JSON/);
  assert.throws(() => parsePlan(JSON.stringify({ title: 'x', milestones: [] })), /unexpected shape/);
  assert.throws(() => parsePlan(''), /empty/);
});

test('scheduleMilestones lays milestones end to end', () => {
  const out = scheduleMilestones(raw.milestones, '2026-10-12');
  assert.deepEqual(out.map((m) => m.dueDate), ['2026-10-17', '2026-10-27']);
});

test('scheduleMilestones squeezes the plan into a deadline', () => {
  const out = scheduleMilestones(raw.milestones, '2026-10-12', '2026-10-18');
  assert.deepEqual(out.map((m) => m.dueDate), ['2026-10-14', '2026-10-18']);
});

const { generatePlan, modelChain } = require('../src/services/gemini');

function fakeClient(results) {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent({ model }) {
        calls.push(model);
        const next = results.shift();
        if (next instanceof Error) throw next;
        return { text: JSON.stringify(next) };
      },
    },
  };
}

const apiError = (status) => Object.assign(new Error(`status ${status}`), { status });

test('generatePlan falls back to the next model when one is busy or retired', async () => {
  const client = fakeClient([apiError(503), apiError(404), raw]);
  const plan = await generatePlan('Launch a blog', { today: '2026-10-12' }, { client });
  assert.equal(plan.title, 'Launch blog');
  assert.deepEqual(client.calls, modelChain().slice(0, 3));
});

test('generatePlan reports a busy AI after every model fails', async () => {
  const client = fakeClient(modelChain().map(() => apiError(503)));
  await assert.rejects(generatePlan('Launch a blog', { today: '2026-10-12' }, { client }), {
    status: 503,
    message: /busy/,
  });
});

test('generatePlan does not retry a rejected key', async () => {
  const client = fakeClient([apiError(403)]);
  await assert.rejects(generatePlan('Launch a blog', { today: '2026-10-12' }, { client }), /key was rejected/);
  assert.equal(client.calls.length, 1);
});

test('generatePlan moves on when a model hangs', async () => {
  const calls = [];
  const client = {
    models: {
      generateContent({ model, config }) {
        calls.push(model);
        if (calls.length === 1) {
          return new Promise((_, reject) =>
            config.abortSignal.addEventListener('abort', () => reject(new Error('This operation was aborted')))
          );
        }
        return Promise.resolve({ text: JSON.stringify(raw) });
      },
    },
  };
  // AbortSignal.timeout timers are unref'd; keep the loop alive like a running server would.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const plan = await generatePlan('Launch a blog', { today: '2026-10-12' }, { client, attemptTimeoutMs: 50 });
    assert.equal(plan.title, 'Launch blog');
  } finally {
    clearInterval(keepAlive);
  }
  assert.equal(calls.length, 2);
});
