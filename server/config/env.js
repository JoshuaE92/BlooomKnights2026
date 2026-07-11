import dotenv from 'dotenv';

dotenv.config();

// Single place that reads process.env. Everything else imports `env`
// from here so we never sprinkle process.env.* across the codebase.
export const env = {
  port: process.env.PORT || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Your DB friend provides this connection string. Local example:
  //   mongodb://127.0.0.1:27017/bloomknights
  mongoUri: process.env.MONGO_URI,
  // Google Gemini key. If missing, aiService falls back to the rule-based mock.
  geminiApiKey: process.env.GEMINI_API_KEY,
  // 'mock' = never call Gemini (free, for dev/testing). 'live' = use Gemini.
  // Defaults to 'live' when unset. Set AI_MODE=mock to save quota while testing.
  aiMode: (process.env.AI_MODE || 'live').toLowerCase(),
};
