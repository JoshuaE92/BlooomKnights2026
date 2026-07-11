const dotenv = require('dotenv');

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Gmail SMTP (use an App Password, not your real Gmail password)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || 465,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_USER,

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

module.exports = env;
