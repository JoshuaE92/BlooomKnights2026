const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Protect routes — expects "Authorization: Bearer <token>".
 * Attaches the authenticated user document to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

/**
 * Require the authenticated user to have a verified email.
 * Use after protect() on routes that need a confirmed address.
 */
const requireVerified = (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    return res.status(403).json({ success: false, message: 'Please verify your email to access this resource' });
  }
  next();
};

module.exports = { protect, requireVerified };
