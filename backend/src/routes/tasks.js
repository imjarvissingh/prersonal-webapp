const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { TASK_STATUSES } = require('../models/Task');
const { validate } = require('../middleware/validate');
const { notFound, badRequest } = require('../utils/httpError');
const { env } = require('../config/env');
const { todayKey } = require('../utils/dates');
const { rolloverTasks } = require('../services/rollover');
const { planTimeBlocks, toMinutes } = require('../services/timeBlocks');
const { z, objectId, dateKey, time, level, idParams } = require('./schemas');

const router = express.Router();

const timeBlock = z
  .object({ start: time, end: time })
  .refine((b) => b.start < b.end, { message: 'Time block must end after it starts' });

const taskBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  notes: z.string().trim().max(4000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: level.optional(),
  energy: level.optional(),
  estimateMinutes: z.number().int().min(0).max(1440).optional(),
  scheduledDate: dateKey.nullable().optional(),
  timeBlock: timeBlock.nullable().optional(),
  dueDate: dateKey.nullable().optional(),
  project: objectId.nullable().optional(),
  milestone: objectId.nullable().optional(),
  order: z.number().optional(),
});

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const listQuery = z.object({
  date: dateKey.optional(),
  from: dateKey.optional(),
  to: dateKey.optional(),
  project: objectId.optional(),
  milestone: objectId.optional(),
  status: z.enum(TASK_STATUSES).optional(),
  energy: level.optional(),
  backlog: bool.optional(),
  overdue: bool.optional(),
});

// Makes sure a referenced project/milestone belongs to the user and that the
// milestone sits inside the project. Returns the project id implied by the milestone.
async function checkRefs(owner, { project, milestone }) {
  let projectId = project;
  if (milestone) {
    const m = await Milestone.findOne({ _id: milestone, owner }).select('project');
    if (!m) throw badRequest('Milestone not found');
    if (projectId && String(m.project) !== String(projectId)) {
      throw badRequest('Milestone belongs to a different project');
    }
    projectId = String(m.project);
  }
  if (projectId && !(await Project.exists({ _id: projectId, owner }))) {
    throw badRequest('Project not found');
  }
  return projectId;
}

async function findOwned(req) {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) throw notFound('Task not found');
  return task;
}

const SORT = { scheduledDate: 1, 'timeBlock.start': 1, order: 1, createdAt: 1 };

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const q = req.validatedQuery;
  const today = todayKey(env.timezone);
  const filter = { owner: req.user._id };

  if (q.date) filter.scheduledDate = q.date;
  else if (q.from || q.to) {
    filter.scheduledDate = { $ne: null };
    if (q.from) filter.scheduledDate.$gte = q.from;
    if (q.to) filter.scheduledDate.$lte = q.to;
  }
  if (q.backlog) filter.scheduledDate = null;
  if (q.project) filter.project = q.project;
  if (q.milestone) filter.milestone = q.milestone;
  if (q.status) filter.status = q.status;
  if (q.energy) filter.energy = q.energy;
  if (q.overdue) {
    filter.status = { $ne: 'done' };
    filter.$or = [
      { dueDate: { $ne: null, $lt: today } },
      { scheduledDate: { $ne: null, $lt: today } },
    ];
  }

  const tasks = await Task.find(filter).sort(SORT).limit(1000).populate('project', 'title color');
  res.json({ tasks, today });
});

router.post('/', validate(taskBody), async (req, res) => {
  const body = { ...req.body };
  body.project = (await checkRefs(req.user._id, body)) || null;
  if (body.timeBlock && !body.scheduledDate) body.scheduledDate = todayKey(env.timezone);
  if (body.order === undefined && body.scheduledDate) {
    const last = await Task.findOne({ owner: req.user._id, scheduledDate: body.scheduledDate }).sort({ order: -1 });
    body.order = last ? last.order + 1 : 0;
  }
  const task = await Task.create({ ...body, owner: req.user._id });
  await task.populate('project', 'title color');
  res.status(201).json({ task });
});

// Runs the rollover for the signed-in user right now (the cron job does
// everyone at midnight; clients call this on launch to catch up immediately).
router.post('/rollover', async (req, res) => {
  const result = await rolloverTasks({ owner: req.user._id });
  res.json(result);
});

const autoScheduleBody = z.object({ date: dateKey.optional() });

// Energy-aware auto time-blocking for one day.
router.post('/auto-schedule', validate(autoScheduleBody), async (req, res) => {
  const today = todayKey(env.timezone);
  const date = req.body.date || today;
  if (date < today) throw badRequest('Cannot schedule a day in the past');

  const tasks = await Task.find({ owner: req.user._id, scheduledDate: date });
  let notBefore = 0;
  if (date === today) {
    const nowParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: env.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
    notBefore = toMinutes(nowParts);
  }
  const plan = planTimeBlocks({
    tasks: tasks.map((t) => t.toJSON()),
    dayStart: req.user.dayStart,
    dayEnd: req.user.dayEnd,
    notBefore,
  });

  if (plan.placed.length > 0) {
    await Task.bulkWrite(
      plan.placed.map((p) => ({
        updateOne: {
          filter: { _id: p.id, owner: req.user._id },
          update: { $set: { timeBlock: { start: p.start, end: p.end } } },
        },
      }))
    );
  }
  const updated = await Task.find({ owner: req.user._id, scheduledDate: date })
    .sort(SORT)
    .populate('project', 'title color');
  res.json({ date, placed: plan.placed.length, unplaced: plan.unplaced, tasks: updated });
});

const reorderBody = z.object({ ids: z.array(objectId).min(1).max(500) });

router.post('/reorder', validate(reorderBody), async (req, res) => {
  await Task.bulkWrite(
    req.body.ids.map((id, index) => ({
      updateOne: { filter: { _id: id, owner: req.user._id }, update: { $set: { order: index } } },
    }))
  );
  res.json({ ok: true });
});

router.get('/:id', validate(idParams, 'params'), async (req, res) => {
  const task = await findOwned(req);
  await task.populate('project', 'title color');
  res.json({ task });
});

router.patch('/:id', validate(idParams, 'params'), validate(taskBody.partial()), async (req, res) => {
  const task = await findOwned(req);
  const body = { ...req.body };
  if ('project' in body || 'milestone' in body) {
    const refs = {
      project: 'project' in body ? body.project : task.project && String(task.project),
      milestone: 'milestone' in body ? body.milestone : task.milestone && String(task.milestone),
    };
    // Moving a task to another project drops a milestone from the old one.
    if ('project' in body && !('milestone' in body) && refs.milestone) {
      const m = await Milestone.findById(refs.milestone).select('project');
      if (!m || String(m.project) !== String(body.project)) refs.milestone = null;
      body.milestone = refs.milestone;
    }
    body.project = (await checkRefs(req.user._id, refs)) || null;
  }
  // Clearing the day also clears its time block.
  if (body.scheduledDate === null) body.timeBlock = null;
  // Rescheduling by hand resets the rollover streak.
  if (body.scheduledDate && body.scheduledDate !== task.scheduledDate) {
    body.rolloverCount = 0;
    body.originalDate = null;
  }
  task.set(body);
  await task.save();
  await task.populate('project', 'title color');
  res.json({ task });
});

router.delete('/:id', validate(idParams, 'params'), async (req, res) => {
  const task = await findOwned(req);
  await task.deleteOne();
  res.status(204).end();
});

module.exports = router;
