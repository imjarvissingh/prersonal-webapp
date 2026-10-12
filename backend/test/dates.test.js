const test = require('node:test');
const assert = require('node:assert/strict');
const { toDateKey, isDateKey, addDays, diffDays, startOfWeek } = require('../src/utils/dates');

test('toDateKey respects the timezone', () => {
  const instant = new Date('2026-03-01T20:30:00Z');
  assert.equal(toDateKey(instant, 'UTC'), '2026-03-01');
  assert.equal(toDateKey(instant, 'Asia/Kolkata'), '2026-03-02');
  assert.equal(toDateKey(instant, 'America/Los_Angeles'), '2026-03-01');
});

test('isDateKey rejects impossible dates', () => {
  assert.ok(isDateKey('2024-02-29'));
  assert.ok(!isDateKey('2023-02-29'));
  assert.ok(!isDateKey('2026-13-01'));
  assert.ok(!isDateKey('26-1-1'));
});

test('addDays and diffDays cross month and year boundaries', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(diffDays('2026-12-30', '2027-01-02'), 3);
  assert.equal(diffDays('2027-01-02', '2026-12-30'), -3);
});

test('startOfWeek returns the Monday', () => {
  assert.equal(startOfWeek('2026-10-12'), '2026-10-12'); // Monday
  assert.equal(startOfWeek('2026-10-18'), '2026-10-12'); // Sunday
  assert.equal(startOfWeek('2026-10-14'), '2026-10-12');
});
