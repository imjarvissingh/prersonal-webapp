const mongoose = require('mongoose');
const { jsonTransform } = require('./plugins');
const { DATE_KEY_RE } = require('../utils/dates');

const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'archived'];

const projectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'active' },
    color: { type: String, default: '#6366f1', match: /^#[0-9a-fA-F]{6}$/ },
    startDate: { type: String, match: DATE_KEY_RE },
    dueDate: { type: String, match: DATE_KEY_RE },
    aiGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String, maxlength: 4000 },
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, status: 1, updatedAt: -1 });
jsonTransform(projectSchema);

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
