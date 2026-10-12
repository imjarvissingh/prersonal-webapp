const express = require('express');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const { PROJECT_STATUSES } = require('../models/Project');
const { validate } = require('../middleware/validate');
const { notFound, badRequest } = require('../utils/httpError');
const { env } = require('../config/env');
const { todayKey } = require('../utils/dates');
const { withStats } = require('../services/projectStats');
const { summarizeTasks } = require('../services/health');
const { z, dateKey, idParams } = require('./schemas');

const router = express.Router();

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #6366f1');

const projectBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(140),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  color: color.optional(),
  startDate: dateKey.nullable().optional(),
  dueDate: dateKey.nullable().optional(),
});

const listQuery = z.object({
  status: z.enum([...PROJECT_STATUSES, 'all']).optional(),
});

const milestoneBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(140),
  description: z.string().trim().max(2000).optional(),
  dueDate: dateKey.nullable().optional(),
  order: z.number().int().min(0).optional(),
});

function checkDates({ startDate, dueDate }) {
  if (startDate && dueDate && dueDate < startDate) {
    throw badRequest('Due date must be on or after the start date');
  }
}

async function findOwned(req) {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw notFound('Project not found');
  return project;
}

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { status } = req.validatedQuery;
  const filter = { owner: req.user._id };
  if (status && status !== 'all') filter.status = status;
  else if (!status) filter.status = { $ne: 'archived' };
  const projects = await Project.find(filter).sort({ updatedAt: -1 });
  res.json({ projects: await withStats(req.user._id, projects, todayKey(env.timezone)) });
});

router.post('/', validate(projectBody), async (req, res) => {
  checkDates(req.body);
  const project = await Project.create({
    ...req.body,
    startDate: req.body.startDate || todayKey(env.timezone),
    owner: req.user._id,
  });
  const [withProgress] = await withStats(req.user._id, [project], todayKey(env.timezone));
  res.status(201).json({ project: withProgress });
});

router.get('/:id', validate(idParams, 'params'), async (req, res) => {
  const today = todayKey(env.timezone);
  const project = await findOwned(req);
  const [milestones, tasks] = await Promise.all([
    Milestone.find({ project: project._id, owner: req.user._id }).sort({ order: 1, createdAt: 1 }),
    Task.find({ project: project._id, owner: req.user._id })
      .sort({ order: 1, createdAt: 1 })
      .populate('project', 'title color'),
  ]);
  const [projectWithStats] = await withStats(req.user._id, [project], today);
  const taskJson = tasks.map((t) => t.toJSON());
  const milestonesWithStats = milestones.map((m) => {
    const own = taskJson.filter((t) => t.milestone && String(t.milestone) === String(m._id));
    return { ...m.toJSON(), stats: summarizeTasks(own, today) };
  });
  res.json({ project: projectWithStats, milestones: milestonesWithStats, tasks: taskJson });
});

router.patch('/:id', validate(idParams, 'params'), validate(projectBody.partial()), async (req, res) => {
  const project = await findOwned(req);
  const next = { ...project.toObject(), ...req.body };
  checkDates(next);
  project.set(req.body);
  await project.save();
  const [withProgress] = await withStats(req.user._id, [project], todayKey(env.timezone));
  res.json({ project: withProgress });
});

router.delete('/:id', validate(idParams, 'params'), async (req, res) => {
  const project = await findOwned(req);
  await Promise.all([
    Task.deleteMany({ project: project._id, owner: req.user._id }),
    Milestone.deleteMany({ project: project._id, owner: req.user._id }),
  ]);
  await project.deleteOne();
  res.status(204).end();
});

router.post(
  '/:id/milestones',
  validate(idParams, 'params'),
  validate(milestoneBody),
  async (req, res) => {
    const project = await findOwned(req);
    let { order } = req.body;
    if (order === undefined) {
      const last = await Milestone.findOne({ project: project._id }).sort({ order: -1 });
      order = last ? last.order + 1 : 0;
    }
    const milestone = await Milestone.create({
      ...req.body,
      order,
      project: project._id,
      owner: req.user._id,
    });
    res.status(201).json({ milestone: { ...milestone.toJSON(), stats: summarizeTasks([], todayKey(env.timezone)) } });
  }
);

module.exports = router;
module.exports.milestoneBody = milestoneBody;
