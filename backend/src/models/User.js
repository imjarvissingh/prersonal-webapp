const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { jsonTransform } = require('./plugins');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    // Daily working hours used by the planner to lay out time blocks.
    dayStart: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    dayEnd: { type: String, default: '18:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

jsonTransform(userSchema, ['passwordHash']);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
