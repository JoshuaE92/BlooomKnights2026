import app from './app.js';
import { env } from './config/env.js';

// Entry point: start the HTTP server.
app.listen(env.port, () => {
  console.log(`🌱 BloomKnights server running on http://localhost:${env.port} [${env.nodeEnv}]`);
});
