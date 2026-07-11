const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendUsernameReminderEmail,
} = require('../services/emailService');

// Shape the user object returned to clients (never expose hashes/tokens)
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

/**
 * @route  POST /api/auth/register
 * @body   { username, email, password }
 * Creates the account and emails a verification link.
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ success: false, message: `That ${field} is already in use` });
    }

    const user = new User({ username, email, password });
    const rawVerifyToken = user.createEmailVerificationToken();
    await user.save();

    try {
      await sendVerificationEmail(user, rawVerifyToken);
    } catch (emailErr) {
      // Don't fail registration if SMTP hiccups — user can hit resend-verification
      console.error('Failed to send verification email:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Account created. Check your email for a verification link.',
      token: generateToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route  GET /api/auth/verify-email/:token
 * Marks the account's email as verified using the emailed token.
 */
const verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = User.hashToken(req.params.token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Verification link is invalid or has expired' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route  POST /api/auth/resend-verification
 * @body   { email }
 * Re-sends the verification email. Always responds 200 to avoid leaking
 * which addresses have accounts.
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If an unverified account exists for that email, a new verification link has been sent.',
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.isEmailVerified) {
      return res.json(genericResponse);
    }

    const rawVerifyToken = user.createEmailVerificationToken();
    await user.save();
    await sendVerificationEmail(user, rawVerifyToken);

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @route  POST /api/auth/login
 * @body   { identifier, password }  — identifier is username OR email
 * Returns a JWT on success.
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const lookup = identifier.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: lookup }, { username: lookup }],
    }).select('+password');

    // Same message for "no user" and "wrong password" — don't leak which
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        needsVerification: true,
      });
    }

    return res.json({
      success: true,
      token: generateToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route  POST /api/auth/forgot-username
 * @body   { email }
 * Emails the username tied to the address. Always responds 200.
 */
const forgotUsername = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, the username has been sent to it.',
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await sendUsernameReminderEmail(user);
    }

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @route  POST /api/auth/forgot-password
 * @body   { email }
 * Emails a time-limited password reset link. Always responds 200.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json(genericResponse);
    }

    const rawResetToken = user.createPasswordResetToken();
    await user.save();

    try {
      await sendPasswordResetEmail(user, rawResetToken);
    } catch (emailErr) {
      // Roll back the token if the email couldn't be delivered
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw emailErr;
    }

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @route  POST /api/auth/reset-password/:token
 * @body   { password }
 * Sets a new password using the emailed reset token.
 */
const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = User.hashToken(req.params.token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' });
    }

    user.password = req.body.password; // re-hashed by the pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route  GET /api/auth/me   (protected)
 * Returns the currently authenticated user.
 */
const getMe = async (req, res) => {
  return res.json({ success: true, user: publicUser(req.user) });
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotUsername,
  forgotPassword,
  resetPassword,
  getMe,
};
