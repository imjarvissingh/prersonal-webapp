const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { env } = require('../config/env');
const { todayKey, toDateKey, addDays, startOfWeek } = require('../utils/dates');
const { withStats } = require('../services/projectStats');
const { summarizeTasks, percent } = require('../services/health');

const router = express.Router();

router.get('/', async (req, res) => {
  const owner = req.user._id;
  const today = todayKey(env.timezone);
  const weekAgo = addDays(today, -6);

  const [projects, todayTasks, recentDone, overdueCount, backlogCount] = await Promise.all([
    Project.find({ owner, status: { $in: ['active', 'on_hold'] } }).sort({ updatedAt: -1 }),
    Task.find({ owner, scheduledDate: today })
      .sort({ 'timeBlock.start': 1, order: 1 })
      .populate('project', 'title color'),
    Task.find({
      owner,
      status: 'done',
      completedAt: { $gte: new Date(Date.now() - 8 * 86400000) },
    }).select('completedAt estimateMinutes'),
    Task.countDocuments({
      owner,
      status: { $ne: 'done' },
      $or: [{ dueDate: { $ne: null, $lt: today } }, { scheduledDate: { $ne: null, $lt: today } }],
    }),
    Task.countDocuments({ owner, status: { $ne: 'done' }, scheduledDate: null }),
  ]);

  const projectsWithStats = await withStats(owner, projects, today);
  const healthCounts = { green: 0, yellow: 0, red: 0 };
  let totalTasks = 0;
  let doneTasks = 0;
  for (const p of projectsWithStats) {
    healthCounts[p.stats.health] += 1;
    totalTasks += p.stats.total;
    doneTasks += p.stats.done;
  }

  const todayJson = todayTasks.map((t) => t.toJSON());
  const todaySummary = summarizeTasks(todayJson, today);
  const energy = { low: { total: 0, done: 0 }, medium: { total: 0, done: 0 }, high: { total: 0, done: 0 } };
  let plannedMinutes = 0;
  let doneMinutes = 0;
  let rolledOver = 0;
  for (const t of todayJson) {
    energy[t.energy].total += 1;
    plannedMinutes += t.estimateMinutes || 0;
    if (t.status === 'done') {
      energy[t.energy].done += 1;
      doneMinutes += t.estimateMinutes || 0;
    }
    if (t.rolloverCount > 0) rolledOver += 1;
  }

  // Completed tasks per day over the last 7 days (oldest first).
  const byDay = new Map();
  for (let i = 0; i < 7; i += 1) byDay.set(addDays(weekAgo, i), 0);
  for (const t of recentDone) {
    const key = toDateKey(t.completedAt, env.timezone);
    if (byDay.has(key)) byDay.set(key, byDay.get(key) + 1);
  }
  const weekStart = startOfWeek(today);
  const completedThisWeek = [...byDay.entries()]
    .filter(([key]) => key >= weekStart)
    .reduce((sum, [, n]) => sum + n, 0);

  res.json({
    today,
    timezone: env.timezone,
    overall: {
      activeProjects: projectsWithStats.length,
      progress: percent(doneTasks, totalTasks),
      totalTasks,
      doneTasks,
      overdueTasks: overdueCount,
      backlogTasks: backlogCount,
      completedThisWeek,
      healthCounts,
    },
    todaySummary: {
      ...todaySummary,
      plannedMinutes,
      doneMinutes,
      rolledOver,
      energy,
    },
    todayTasks: todayJson,
    activity: [...byDay.entries()].map(([date, completed]) => ({ date, completed })),
    projects: projectsWithStats,
  });
});

module.exports = router;
