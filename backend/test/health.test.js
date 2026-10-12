const test = require('node:test');
const assert = require('node:assert/strict');
const { computeHealth, expectedProgress, summarizeTasks, isOverdue } = require('../src/services/health');

const today = '2026-10-12';

test('expectedProgress follows the calendar', () => {
  assert.equal(expectedProgress('2026-10-01', '2026-10-21', today), 55);
  assert.equal(expectedProgress('2026-10-20', '2026-10-30', today), 0);
  assert.equal(expectedProgress('2026-09-01', '2026-10-01', today), 100);
  assert.equal(expectedProgress(undefined, '2026-10-01', today), null);
});

test('on-track project is green', () => {
  const r = computeHealth({
    total: 10,
    done: 6,
    project: { startDate: '2026-10-01', dueDate: '2026-10-21' },
    today,
  });
  assert.equal(r.health, 'green');
  assert.equal(r.progress, 60);
});

test('slightly behind schedule is yellow, far behind is red', () => {
  const project = { startDate: '2026-10-01', dueDate: '2026-10-21' }; // expected 55
  assert.equal(computeHealth({ total: 10, done: 4, project, today }).health, 'yellow');
  assert.equal(computeHealth({ total: 10, done: 2, project, today }).health, 'red');
});

test('past due with open work is red', () => {
  const r = computeHealth({ total: 4, done: 3, project: { dueDate: '2026-10-10' }, today });
  assert.equal(r.health, 'red');
  assert.match(r.reasons.join(' '), /Past due/);
});

test('overdue ratio decides yellow vs red', () => {
  assert.equal(computeHealth({ total: 20, done: 0, overdue: 1, today }).health, 'yellow');
  assert.equal(computeHealth({ total: 10, done: 0, overdue: 4, today }).health, 'red');
});

test('stalled tasks and empty projects are yellow, finished ones green', () => {
  assert.equal(computeHealth({ total: 5, done: 1, stalled: 1, today }).health, 'yellow');
  assert.equal(computeHealth({ total: 0, done: 0, today }).health, 'yellow');
  assert.equal(computeHealth({ total: 3, done: 3, project: { dueDate: '2026-01-01' }, today }).health, 'green');
});

test('summarizeTasks counts overdue and stalled tasks', () => {
  const tasks = [
    { status: 'done', scheduledDate: '2026-10-01' },
    { status: 'todo', scheduledDate: '2026-10-11' },
    { status: 'todo', dueDate: '2026-10-30', rolloverCount: 3 },
    { status: 'in_progress', scheduledDate: today },
  ];
  const s = summarizeTasks(tasks, today);
  assert.deepEqual(
    { total: s.total, done: s.done, inProgress: s.inProgress, overdue: s.overdue, stalled: s.stalled, progress: s.progress },
    { total: 4, done: 1, inProgress: 1, overdue: 1, stalled: 1, progress: 25 }
  );
  assert.equal(isOverdue({ status: 'done', dueDate: '2020-01-01' }, today), false);
});
