const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { unauthorized, conflict, badRequest } = require('../utils/httpError');
const { z, time } = require('./schemas');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again in a few minutes' },
});

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email,
  password,
});

const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    dayStart: time.optional(),
    dayEnd: time.optional(),
    currentPassword: z.string().optional(),
    newPassword: password.optional(),
  })
  .refine((v) => !v.newPassword || v.currentPassword, {
    message: 'Current password is required to set a new one',
    path: ['currentPassword'],
  });

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { name, email: mail, password: pass } = req.body;
  if (await User.exists({ email: mail })) {
    throw conflict('An account with that email already exists');
  }
  const user = new User({ name, email: mail });
  await user.setPassword(pass);
  await user.save();
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  if (!user || !(await user.checkPassword(req.body.password))) {
    throw unauthorized('Incorrect email or password');
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, validate(updateMeSchema), async (req, res) => {
  const { name, dayStart, dayEnd, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (name !== undefined) user.name = name;
  if (dayStart !== undefined) user.dayStart = dayStart;
  if (dayEnd !== undefined) user.dayEnd = dayEnd;
  if (user.dayStart >= user.dayEnd) throw badRequest('Day end must be after day start');
  if (newPassword) {
    if (!(await user.checkPassword(currentPassword))) {
      throw badRequest('Current password is incorrect');
    }
    await user.setPassword(newPassword);
  }
  await user.save();
  res.json({ user });
});

module.exports = router;
