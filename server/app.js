import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import productRoutes from './routes/productRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Builds the express app but does NOT start listening — that's server.js's job.
// Keeping them separate makes the app importable in tests later.
const app = express();

app.use(cors());            // let the Vite frontend call us cross-origin
app.use(express.json());    // parse JSON request bodies into req.body

// Liveness check — hit this to prove the server is up.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bloomknights-server' });
});

// --- feature routes ---
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFound);          // 404 for anything unmatched
app.use(errorHandler);      // last: format any error into JSON

export default app;
