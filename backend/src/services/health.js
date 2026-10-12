const { diffDays } = require('../utils/dates');

// Pure project-health rules. Kept free of database access so they are easy to test
// and so the web and mobile apps can show the same reasons the API computed.
//
//   red    the due date has passed with work left, the project is more than 25
//          points behind where the calendar says it should be, or at least 30%
//          of the open tasks are overdue
//   yellow more than 10 points behind schedule, any overdue task, any task rolled
//          over 3+ times, or nothing planned yet
//   green  everything else
const LAG_RED = 25;
const LAG_YELLOW = 10;
const OVERDUE_RATIO_RED = 0.3;
const STALLED_ROLLOVERS = 3;

function percent(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// Where progress "should" be if work were spread evenly from start to due date.
function expectedProgress(startDate, dueDate, today) {
  if (!startDate || !dueDate) return null;
  const span = diffDays(startDate, dueDate);
  if (span <= 0) return today >= dueDate ? 100 : 0;
  const elapsed = diffDays(startDate, today);
  return Math.round(Math.min(Math.max(elapsed / span, 0), 1) * 100);
}

function computeHealth({ total = 0, done = 0, overdue = 0, stalled = 0, project = {}, today }) {
  const progress = percent(done, total);
  const open = total - done;
  const expected = expectedProgress(project.startDate, project.dueDate, today);
  const reasons = [];

  if (project.status === 'completed' || (total > 0 && open === 0)) {
    return { health: 'green', progress, expectedProgress: expected, reasons: ['All tasks complete'] };
  }

  let health = 'green';
  const raise = (level, reason) => {
    reasons.push(reason);
    if (level === 'red' || (level === 'yellow' && health === 'green')) health = level;
  };

  if (total === 0) {
    raise('yellow', 'No tasks planned yet');
  }
  if (project.dueDate && project.dueDate < today && open > 0) {
    raise('red', `Past due date with ${open} open task${open === 1 ? '' : 's'}`);
  }
  if (expected !== null && total > 0) {
    const lag = expected - progress;
    if (lag > LAG_RED) raise('red', `${lag} points behind schedule`);
    else if (lag > LAG_YELLOW) raise('yellow', `${lag} points behind schedule`);
  }
  if (overdue > 0) {
    const ratio = open > 0 ? overdue / open : 0;
    raise(
      ratio >= OVERDUE_RATIO_RED ? 'red' : 'yellow',
      `${overdue} overdue task${overdue === 1 ? '' : 's'}`
    );
  }
  if (stalled > 0) {
    raise('yellow', `${stalled} task${stalled === 1 ? '' : 's'} rolled over ${STALLED_ROLLOVERS}+ times`);
  }
  if (reasons.length === 0) reasons.push('On track');

  return { health, progress, expectedProgress: expected, reasons };
}

function isOverdue(task, today) {
  if (task.status === 'done') return false;
  return Boolean(
    (task.dueDate && task.dueDate < today) || (task.scheduledDate && task.scheduledDate < today)
  );
}

function isStalled(task) {
  return task.status !== 'done' && (task.rolloverCount || 0) >= STALLED_ROLLOVERS;
}

// Summarise a list of plain task objects.
function summarizeTasks(tasks, today) {
  const summary = { total: 0, done: 0, inProgress: 0, overdue: 0, stalled: 0 };
  for (const t of tasks) {
    summary.total += 1;
    if (t.status === 'done') summary.done += 1;
    if (t.status === 'in_progress') summary.inProgress += 1;
    if (isOverdue(t, today)) summary.overdue += 1;
    if (isStalled(t)) summary.stalled += 1;
  }
  summary.progress = percent(summary.done, summary.total);
  return summary;
}

module.exports = {
  LAG_RED,
  LAG_YELLOW,
  OVERDUE_RATIO_RED,
  STALLED_ROLLOVERS,
  percent,
  expectedProgress,
  computeHealth,
  isOverdue,
  isStalled,
  summarizeTasks,
};
