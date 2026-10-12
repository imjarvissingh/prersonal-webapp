const test = require('node:test');
const assert = require('node:assert/strict');
const { planTimeBlocks, freeIntervals, toMinutes, fromMinutes } = require('../src/services/timeBlocks');

test('time helpers round-trip', () => {
  assert.equal(toMinutes('09:30'), 570);
  assert.equal(fromMinutes(570), '09:30');
});

test('freeIntervals skips busy blocks', () => {
  const free = freeIntervals(540, 720, [
    { start: '10:00', end: '10:30' },
    { start: '09:00', end: '09:10' },
  ]);
  assert.deepEqual(free, [
    [550, 600],
    [630, 720],
  ]);
});

test('high-energy work is placed first and existing blocks are respected', () => {
  const tasks = [
    { id: 'low', energy: 'low', priority: 'high', estimateMinutes: 30, status: 'todo' },
    { id: 'high', energy: 'high', priority: 'low', estimateMinutes: 60, status: 'todo' },
    { id: 'fixed', energy: 'medium', status: 'todo', timeBlock: { start: '10:00', end: '11:00' } },
    { id: 'done', energy: 'high', status: 'done', estimateMinutes: 30 },
  ];
  const { placed, unplaced } = planTimeBlocks({ tasks, dayStart: '09:00', dayEnd: '12:00' });
  assert.deepEqual(placed, [
    { id: 'high', start: '09:00', end: '10:00' },
    { id: 'low', start: '11:00', end: '11:30' },
  ]);
  assert.deepEqual(unplaced, []);
});

test('tasks that do not fit are reported and nothing lands before notBefore', () => {
  const tasks = [
    { id: 'a', energy: 'high', estimateMinutes: 120, status: 'todo' },
    { id: 'b', energy: 'medium', estimateMinutes: 50, status: 'todo' },
  ];
  const { placed, unplaced } = planTimeBlocks({
    tasks,
    dayStart: '09:00',
    dayEnd: '17:00',
    notBefore: toMinutes('15:52'),
  });
  assert.deepEqual(placed, [{ id: 'b', start: '15:55', end: '16:45' }]);
  assert.deepEqual(unplaced, ['a']);
});
