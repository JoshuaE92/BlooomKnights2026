const dotenv = require('dotenv');

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Resend HTTPS email API (works on Render free tier, which blocks SMTP)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,

  // Used to build links inside emails (points at the frontend)
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};

// Fail fast if critical secrets are missing
const required = ['MONGO_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Emails fail without these, but the API can still run — warn, don't crash
if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
  console.warn('WARNING: RESEND_API_KEY / EMAIL_FROM not set — email sending will fail');
}

module.exports = env;
