import dotenv from 'dotenv';

dotenv.config();

// Single place that reads process.env. Everything else imports `env`
// from here so we never sprinkle process.env.* across the codebase.
export const env = {
  port: process.env.PORT || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
};
