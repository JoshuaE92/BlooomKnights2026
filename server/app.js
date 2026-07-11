const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/api/health', (req, res) => {
  const dbState = DB_STATES[mongoose.connection.readyState] || 'unknown';
  const healthy = dbState === 'connected';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    db: dbState,
    uptime: Math.floor(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
// TODO: mount when implemented
// app.use('/api/products', require('./routes/productRoutes'));
// app.use('/api/stores', require('./routes/storeRoutes'));
// app.use('/api/ai', require('./routes/aiRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
