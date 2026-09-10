const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const authRoutes        = require('./routes/auth');
const jobRoutes         = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const talentRoutes      = require('./routes/talent');
const categoryRoutes    = require('./routes/categories');
const reviewRoutes      = require('./routes/reviews');
const paymentRoutes     = require('./routes/payments');
const searchRoutes      = require('./routes/search');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// Open CORS for local development (frontend served from localhost:3000)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json());
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/jobs',         jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/talent',       talentRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/reviews',      reviewRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/search',       searchRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', platform: 'Plated', time: new Date() })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🍽  Plated API running on http://localhost:${PORT}`);
  console.log(`📦  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
});

module.exports = app;
