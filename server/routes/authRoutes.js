const express = require('express');
const {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotUsername,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post('/register', validateRequest(['username', 'email', 'password']), register);
router.post('/login', validateRequest(['identifier', 'password']), login);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', validateRequest(['email']), resendVerification);

router.post('/forgot-username', validateRequest(['email']), forgotUsername);
router.post('/forgot-password', validateRequest(['email']), forgotPassword);
router.post('/reset-password/:token', validateRequest(['password']), resetPassword);

router.get('/me', protect, getMe);

module.exports = router;
