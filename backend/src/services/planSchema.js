const { z } = require('zod');

const level = z.enum(['low', 'medium', 'high']);

const planTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().default(''),
  priority: level.optional().default('medium'),
  energy: level.optional().default('medium'),
  estimateMinutes: z.coerce.number().int().min(5).max(480).optional().default(30),
});

const planMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional().default(''),
  durationDays: z.coerce.number().int().min(1).max(365).optional().default(7),
  tasks: z.array(planTaskSchema).min(1).max(25),
});

// Shape of an AI-generated (or user-edited) project plan.
const planSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(4000).optional().default(''),
  milestones: z.array(planMilestoneSchema).min(1).max(12),
});

module.exports = { planSchema, planMilestoneSchema, planTaskSchema };
