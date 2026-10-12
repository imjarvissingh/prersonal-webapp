// Energy-aware auto time-blocking. Pure functions, no database access.
//
// Unblocked tasks are placed into the free gaps of the working day, high-energy
// work first so it lands in the morning, then by priority, then by manual order.

const ENERGY_RANK = { high: 0, medium: 1, low: 2 };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const MIN_BLOCK = 15;
const SLOT = 5;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function roundUp(minutes, step) {
  return Math.ceil(minutes / step) * step;
}

// Free intervals inside [dayStart, dayEnd) not covered by `busy` blocks.
function freeIntervals(dayStart, dayEnd, busy) {
  const sorted = busy
    .map((b) => [toMinutes(b.start), toMinutes(b.end)])
    .sort((a, b) => a[0] - b[0]);
  const free = [];
  let cursor = dayStart;
  for (const [s, e] of sorted) {
    if (e <= cursor) continue;
    if (s > cursor) free.push([cursor, Math.min(s, dayEnd)]);
    cursor = Math.max(cursor, e);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) free.push([cursor, dayEnd]);
  return free.filter(([s, e]) => e - s >= MIN_BLOCK);
}

function sortForScheduling(tasks) {
  return [...tasks].sort(
    (a, b) =>
      (ENERGY_RANK[a.energy] ?? 1) - (ENERGY_RANK[b.energy] ?? 1) ||
      (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
      (a.order ?? 0) - (b.order ?? 0)
  );
}

/**
 * @param {object} args
 * @param {Array} args.tasks       tasks for the day (only open, unblocked ones are placed)
 * @param {string} args.dayStart   "HH:mm"
 * @param {string} args.dayEnd     "HH:mm"
 * @param {number} [args.notBefore] minutes since midnight; nothing is placed earlier
 * @returns {{ placed: Array<{id, start, end}>, unplaced: Array<id> }}
 */
function planTimeBlocks({ tasks, dayStart, dayEnd, notBefore = 0 }) {
  const start = Math.max(toMinutes(dayStart), roundUp(notBefore, SLOT));
  const end = toMinutes(dayEnd);
  const busy = tasks.filter((t) => t.timeBlock).map((t) => t.timeBlock);
  const free = start < end ? freeIntervals(start, end, busy) : [];

  const candidates = sortForScheduling(
    tasks.filter((t) => t.status !== 'done' && !t.timeBlock)
  );

  const placed = [];
  const unplaced = [];
  for (const task of candidates) {
    const duration = Math.max(MIN_BLOCK, roundUp(task.estimateMinutes || 30, SLOT));
    const slot = free.find(([s, e]) => e - s >= duration);
    if (!slot) {
      unplaced.push(String(task.id ?? task._id));
      continue;
    }
    placed.push({
      id: String(task.id ?? task._id),
      start: fromMinutes(slot[0]),
      end: fromMinutes(slot[0] + duration),
    });
    slot[0] += duration;
  }
  return { placed, unplaced };
}

module.exports = { toMinutes, fromMinutes, freeIntervals, sortForScheduling, planTimeBlocks };
