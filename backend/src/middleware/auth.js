const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const { unauthorized } = require('../utils/httpError');

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized());
  }
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
  const user = await User.findById(payload.sub);
  if (!user) {
    return next(unauthorized('Account no longer exists'));
  }
  req.user = user;
  return next();
}

module.exports = { signToken, requireAuth };
