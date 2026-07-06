'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const env        = require('./config/env');
const errorHandler = require('./middleware/errorHandler.middleware');

// ─── Route modules ────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth.routes');
const listingsRoutes = require('./routes/listings.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const messagesRoutes = require('./routes/messages.routes');
const adminRoutes    = require('./routes/admin.routes');
const profilesRoutes = require('./routes/profiles.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();

// ─── Security & parsing middleware ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// DEFINING ALLOWED ORIGINS
const allowedOrigins = [
  'https://hustle-grad.vercel.app', 
  'https://hustlegrad.vercel.app', // Adding both variants just in case
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:3007',
  'http://localhost:3008',
  'http://localhost:3009'
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// Explicitly handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '3mb' }));
app.use('/uploads', express.static(path.join(__dirname, env.storage.uploadDir)));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/payments', paymentsRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', env: env.nodeEnv })
);

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

// ─── Central error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(env.port, () => {
  console.log(`[SERVER] Running in ${env.nodeEnv} mode on port ${env.port}`);
});

module.exports = app;
