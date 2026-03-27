import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Routes
import authRoutes from './routes/auth.routes';
import badgeRoutes from './routes/badge.routes';
import eventRoutes from './routes/event.routes';
import ticketRoutes from './routes/ticket.routes';
import roomRoutes from './routes/room.routes';
import spaceRoutes from './routes/space.routes';
import eventTypeRoutes from './routes/eventType.routes';
import daypartRoutes from './routes/daypart.routes';
import reportRoutes from './routes/report.routes';
import syncRoutes from './routes/sync.routes';

dotenv.config();

// Worker-only mode: Only run Bull queue processor, don't start HTTP server
const WORKER_ONLY = process.env.WORKER_ONLY === 'true';

if (WORKER_ONLY) {
  logger.info('Starting in WORKER ONLY mode - Bull queue processor only');
  // Initialize sync job processor
  import('./jobs/sync.job');
  logger.info('Worker initialized and processing jobs');
  // Keep process alive
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down worker gracefully');
    process.exit(0);
  });
  // Exit early, don't start Express server
} else {
  // Initialize sync job processor for API mode
  import('./jobs/sync.job');
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy headers from ngrok
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow ngrok interstitial page
}));
app.use(compression());

// CORS: Allow localhost, ngrok, and production URLs
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.CORS_ORIGIN, // Production frontend URL (e.g., Vercel)
    ].filter(Boolean); // Remove undefined values

    // Allow localhost, production origin, and ngrok patterns
    if (
      allowedOrigins.includes(origin) ||
      origin.match(/\.ngrok-free\.app$/) ||
      origin.match(/\.vercel\.app$/) // Allow Vercel preview deployments
    ) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/event-types', eventTypeRoutes);
app.use('/api/dayparts', daypartRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Only start server if not in worker-only mode
if (!WORKER_ONLY) {
  // Listen on all interfaces (0.0.0.0) for Cloud Run / ngrok
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS Origin: ${process.env.CORS_ORIGIN || 'localhost'}`);
    logger.info(`Accepting connections from all interfaces`);
  });
}

export default app;
