const mongoose = require('mongoose');
const { jsonTransform } = require('./plugins');
const { DATE_KEY_RE } = require('../utils/dates');

const TASK_STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const ENERGY_LEVELS = ['low', 'medium', 'high'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeBlockSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, match: TIME_RE },
    end: { type: String, required: true, match: TIME_RE },
  },
  { _id: false, id: false }
);

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 4000, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    energy: { type: String, enum: ENERGY_LEVELS, default: 'medium' },
    estimateMinutes: { type: Number, min: 0, max: 24 * 60, default: 30 },
    // Day the task is planned for (YYYY-MM-DD, in APP_TIMEZONE). Null = backlog.
    scheduledDate: { type: String, match: DATE_KEY_RE, default: null },
    // Optional time block within scheduledDate.
    timeBlock: { type: timeBlockSchema, default: null },
    dueDate: { type: String, match: DATE_KEY_RE, default: null },
    order: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    // Rollover bookkeeping.
    rolloverCount: { type: Number, default: 0 },
    originalDate: { type: String, match: DATE_KEY_RE, default: null },
    lastRolledOverAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ owner: 1, scheduledDate: 1, order: 1 });
taskSchema.index({ status: 1, scheduledDate: 1 });
taskSchema.index({ project: 1, milestone: 1 });

taskSchema.pre('validate', function checkTimeBlock() {
  if (this.timeBlock && this.timeBlock.start >= this.timeBlock.end) {
    this.invalidate('timeBlock', 'Time block must end after it starts');
  }
  if (this.timeBlock && !this.scheduledDate) {
    this.invalidate('timeBlock', 'A time block needs a scheduled date');
  }
});

// Keep completedAt in sync with status.
taskSchema.pre('save', function syncCompletedAt() {
  if (this.isModified('status')) {
    this.completedAt = this.status === 'done' ? this.completedAt || new Date() : null;
  }
});

jsonTransform(taskSchema);

module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
Object.assign(module.exports, { TASK_STATUSES, PRIORITIES, ENERGY_LEVELS, TIME_RE });
