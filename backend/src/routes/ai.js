const express = require('express');
const rateLimit = require('express-rate-limit');
const Project = require('../models/Project');
const { validate } = require('../middleware/validate');
const { badRequest } = require('../utils/httpError');
const { env } = require('../config/env');
const { todayKey } = require('../utils/dates');
const { generatePlan } = require('../services/gemini');
const { createProjectFromPlan } = require('../services/scaffold');
const { withStats } = require('../services/projectStats');
const { planSchema } = require('../services/planSchema');
const { z, dateKey } = require('./schemas');

const router = express.Router();

// Gemini calls cost money; cap them per user.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'AI request limit reached for this hour' },
});

const promptBody = z.object({
  prompt: z.string().trim().min(10, 'Describe the project in at least a sentence').max(4000),
  deadline: dateKey.optional(),
});

const createBody = z.object({
  plan: planSchema,
  prompt: z.string().trim().max(4000).optional(),
  startDate: dateKey.optional(),
  deadline: dateKey.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

function checkDeadline(deadline, today) {
  if (deadline && deadline <= today) throw badRequest('Deadline must be in the future');
}

async function respondWithProject(req, res, projectId, today) {
  const project = await Project.findOne({ _id: projectId, owner: req.user._id });
  const [withProgress] = await withStats(req.user._id, [project], today);
  res.status(201).json({ project: withProgress });
}

// Step 1: turn a prompt into a plan the user can review and edit.
router.post('/plan', aiLimiter, validate(promptBody), async (req, res) => {
  const today = todayKey(env.timezone);
  checkDeadline(req.body.deadline, today);
  const plan = await generatePlan(req.body.prompt, { deadline: req.body.deadline, today });
  res.json({ plan });
});

// Step 2: save a (possibly edited) plan as a real project with milestones and tasks.
router.post('/projects', validate(createBody), async (req, res) => {
  const today = todayKey(env.timezone);
  const { plan, prompt, deadline, color } = req.body;
  const startDate = req.body.startDate || today;
  if (deadline && deadline <= startDate) throw badRequest('Deadline must be after the start date');
  const projectId = await createProjectFromPlan(req.user._id, plan, { prompt, startDate, deadline, color });
  await respondWithProject(req, res, projectId, today);
});

// One-shot: generate and save in a single call.
router.post('/scaffold', aiLimiter, validate(promptBody), async (req, res) => {
  const today = todayKey(env.timezone);
  const { prompt, deadline } = req.body;
  checkDeadline(deadline, today);
  const plan = await generatePlan(prompt, { deadline, today });
  const projectId = await createProjectFromPlan(req.user._id, plan, { prompt, startDate: today, deadline });
  await respondWithProject(req, res, projectId, today);
});

module.exports = router;
