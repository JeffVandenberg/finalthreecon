import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

dotenv.config();

// Worker-only mode: Only run Bull queue processor with minimal HTTP server
const WORKER_ONLY = process.env.WORKER_ONLY === 'true';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

if (WORKER_ONLY) {
  logger.info('Starting in WORKER ONLY mode - Bull queue processor only');
  logger.info(`PORT environment variable: ${process.env.PORT}`);
  logger.info(`Attempting to bind to port ${PORT} on 0.0.0.0`);

  // Minimal health check endpoint for Cloud Run
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'worker', timestamp: new Date().toISOString() });
  });

  // Start minimal server for Cloud Run health checks first
  const server = app.listen(PORT, '0.0.0.0', () => {
    const addr = server.address();
    logger.info(`Worker health check server SUCCESSFULLY STARTED`);
    logger.info(`Listening on ${JSON.stringify(addr)}`);
    logger.info('Server is ready to accept health check requests');

    // Initialize sync job processor asynchronously (non-blocking)
    // This happens in the background while the HTTP server is already running
    setImmediate(async () => {
      try {
        logger.info('Initializing Bull queue processor...');
        await import('./jobs/sync.job');
        logger.info('Bull queue processor initialized and processing jobs');
      } catch (error: any) {
        logger.error('Failed to initialize Bull queue processor', {
          error: error.message,
          stack: error.stack
        });
        // Don't exit - keep health check server running for debugging
      }
    });
  });

  server.on('error', (error: any) => {
    logger.error('Server error:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down worker gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
} else {
  // API mode: Initialize sync job processor and full Express app
  // Import routes only in API mode to avoid unnecessary initialization
  const authRoutes = require('./routes/auth.routes').default;
  const badgeRoutes = require('./routes/badge.routes').default;
  const eventRoutes = require('./routes/event.routes').default;
  const ticketRoutes = require('./routes/ticket.routes').default;
  const roomRoutes = require('./routes/room.routes').default;
  const spaceRoutes = require('./routes/space.routes').default;
  const eventTypeRoutes = require('./routes/eventType.routes').default;
  const daypartRoutes = require('./routes/daypart.routes').default;
  const reportRoutes = require('./routes/report.routes').default;
  const syncRoutes = require('./routes/sync.routes').default;

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

  // Start API server
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS Origin: ${process.env.CORS_ORIGIN || 'localhost'}`);
    logger.info(`Accepting connections from all interfaces`);
  });
}

export default app;
