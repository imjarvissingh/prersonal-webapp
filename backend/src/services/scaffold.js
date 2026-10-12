const mongoose = require('mongoose');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const { addDays } = require('../utils/dates');

// Lays milestones end to end from `startDate`. If a deadline is given and the
// plan overruns it, durations are scaled down proportionally to fit.
function scheduleMilestones(milestones, startDate, deadline) {
  const durations = milestones.map((m) => m.durationDays || 7);
  const total = durations.reduce((a, b) => a + b, 0);
  let scale = 1;
  if (deadline) {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [dy, dm, dd] = deadline.split('-').map(Number);
    const available = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(sy, sm - 1, sd)) / 86400000);
    if (available > 0 && total > available) scale = available / total;
  }
  let cursor = startDate;
  return milestones.map((m, i) => {
    const days = Math.max(1, Math.round(durations[i] * scale));
    cursor = addDays(cursor, days);
    return { ...m, dueDate: deadline && cursor > deadline ? deadline : cursor };
  });
}

// Creates a project with its milestones and tasks from a validated plan.
// Tasks start in the backlog (no scheduled date) so they can be pulled into days.
async function createProjectFromPlan(owner, plan, { prompt, startDate, deadline, color }) {
  const scheduled = scheduleMilestones(plan.milestones, startDate, deadline);
  const projectDue = deadline || scheduled[scheduled.length - 1].dueDate;

  const write = async (session) => {
    const opts = session ? { session } : {};
    const [project] = await Project.create(
      [
        {
          owner,
          title: plan.title,
          description: plan.description,
          startDate,
          dueDate: projectDue,
          color,
          aiGenerated: Boolean(prompt),
          aiPrompt: prompt,
        },
      ],
      opts
    );

    const milestones = await Milestone.insertMany(
      scheduled.map((m, i) => ({
        owner,
        project: project._id,
        title: m.title,
        description: m.description,
        order: i,
        dueDate: m.dueDate,
      })),
      opts
    );

    const tasks = [];
    scheduled.forEach((m, mi) => {
      m.tasks.forEach((t, ti) => {
        tasks.push({
          owner,
          project: project._id,
          milestone: milestones[mi]._id,
          title: t.title,
          notes: t.notes,
          priority: t.priority,
          energy: t.energy,
          estimateMinutes: t.estimateMinutes,
          dueDate: m.dueDate,
          order: mi * 100 + ti,
        });
      });
    });
    await Task.insertMany(tasks, opts);
    return project._id;
  };

  // Atlas clusters are replica sets, so the whole plan is written atomically.
  // A standalone local mongod has no transactions; fall back to plain writes there.
  const session = await mongoose.startSession();
  try {
    let projectId;
    await session.withTransaction(async () => {
      projectId = await write(session);
    });
    return projectId;
  } catch (err) {
    if (/replica set|Transaction numbers/i.test(err.message || '')) {
      return write(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = { scheduleMilestones, createProjectFromPlan };
