const Task = require('../models/Task');
const { env } = require('../config/env');
const { todayKey } = require('../utils/dates');

// Moves every unfinished task scheduled before `today` onto `today`.
// The original date is kept the first time a task rolls over, the counter is
// bumped, and the old time block is cleared because yesterday's slot means
// nothing on a new day (the planner can re-block it).
async function rolloverTasks({ owner, today = todayKey(env.timezone) } = {}) {
  const filter = {
    status: { $ne: 'done' },
    scheduledDate: { $ne: null, $lt: today },
  };
  if (owner) filter.owner = owner;

  const result = await Task.updateMany(
    filter,
    [
      {
        $set: {
          originalDate: { $ifNull: ['$originalDate', '$scheduledDate'] },
          scheduledDate: today,
          timeBlock: null,
          rolloverCount: { $add: [{ $ifNull: ['$rolloverCount', 0] }, 1] },
          lastRolledOverAt: '$$NOW',
        },
      },
    ],
    { updatePipeline: true }
  );

  return { today, rolledOver: result.modifiedCount };
}

module.exports = { rolloverTasks };
