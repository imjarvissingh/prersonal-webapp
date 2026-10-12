const Task = require('../models/Task');
const { env } = require('../config/env');
const { toDateKey } = require('../utils/dates');
const { computeHealth, STALLED_ROLLOVERS } = require('./health');

const notDone = { $ne: ['$status', 'done'] };
// `$gt: [field, null]` is true only for real strings (null and missing sort lower).
const before = (field, today) => ({ $and: [{ $gt: [field, null] }, { $lt: [field, today] }] });

// Task counts per project for one owner, computed in a single aggregation.
async function taskCountsByProject(owner, projectIds, today) {
  if (projectIds.length === 0) return new Map();
  const rows = await Task.aggregate([
    { $match: { owner, project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              { $and: [notDone, { $or: [before('$dueDate', today), before('$scheduledDate', today)] }] },
              1,
              0,
            ],
          },
        },
        stalled: {
          $sum: {
            $cond: [
              { $and: [notDone, { $gte: [{ $ifNull: ['$rolloverCount', 0] }, STALLED_ROLLOVERS] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

// Attaches { stats: { total, done, ..., progress, health, reasons } } to each project.
async function withStats(owner, projects, today) {
  const counts = await taskCountsByProject(
    owner,
    projects.map((p) => p._id),
    today
  );
  return projects.map((p) => {
    const json = typeof p.toJSON === 'function' ? p.toJSON() : p;
    const c = counts.get(String(p._id)) || { total: 0, done: 0, inProgress: 0, overdue: 0, stalled: 0 };
    const startDate =
      json.startDate || (json.createdAt ? toDateKey(new Date(json.createdAt), env.timezone) : undefined);
    const health = computeHealth({ ...c, project: { ...json, startDate }, today });
    return {
      ...json,
      stats: {
        total: c.total,
        done: c.done,
        inProgress: c.inProgress,
        overdue: c.overdue,
        stalled: c.stalled,
        ...health,
      },
    };
  });
}

module.exports = { taskCountsByProject, withStats };
