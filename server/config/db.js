import mongoose from 'mongoose';
import { env } from './env.js';

// Opens the MongoDB connection. Call this once at startup (server.js) and
// before the seed script runs. Your DB friend owns the actual cluster/URI;
// this file just connects to whatever MONGO_URI points at.
export async function connectDB() {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is not set — add it to your .env');
  }
  await mongoose.connect(env.mongoUri);
  console.log('✅ MongoDB connected');
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
