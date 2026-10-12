const mongoose = require('mongoose');
const { jsonTransform } = require('./plugins');
const { DATE_KEY_RE } = require('../utils/dates');

const milestoneSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    order: { type: Number, default: 0 },
    dueDate: { type: String, match: DATE_KEY_RE },
  },
  { timestamps: true }
);

milestoneSchema.index({ project: 1, order: 1 });
jsonTransform(milestoneSchema);

module.exports = mongoose.models.Milestone || mongoose.model('Milestone', milestoneSchema);
