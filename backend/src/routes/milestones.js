const express = require('express');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const { validate } = require('../middleware/validate');
const { notFound } = require('../utils/httpError');
const { idParams } = require('./schemas');
const { milestoneBody } = require('./projects');

const router = express.Router();

async function findOwned(req) {
  const milestone = await Milestone.findOne({ _id: req.params.id, owner: req.user._id });
  if (!milestone) throw notFound('Milestone not found');
  return milestone;
}

router.patch('/:id', validate(idParams, 'params'), validate(milestoneBody.partial()), async (req, res) => {
  const milestone = await findOwned(req);
  milestone.set(req.body);
  await milestone.save();
  res.json({ milestone });
});

// Deleting a milestone keeps its tasks in the project, just ungrouped.
router.delete('/:id', validate(idParams, 'params'), async (req, res) => {
  const milestone = await findOwned(req);
  await Task.updateMany({ milestone: milestone._id, owner: req.user._id }, { $set: { milestone: null } });
  await milestone.deleteOne();
  res.status(204).end();
});

module.exports = router;
