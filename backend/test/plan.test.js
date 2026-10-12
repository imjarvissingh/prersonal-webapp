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
