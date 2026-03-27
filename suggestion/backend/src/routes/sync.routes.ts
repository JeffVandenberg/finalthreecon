import { Router, Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../utils/logger';
import { syncManager } from '../services/sync/sync-manager.service';

const router = Router();

// Helper to get user ID from authenticated request
const getUserId = (req: Request): string => {
  const user = (req as any).user;
  return user?.id || user?.userId || 'unknown';
};

// Trigger base data sync (spaces, rooms, dayparts)
router.post('/base-data', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const syncJobId = await syncManager.startSync('base-data', userId);

    logger.info('Base data sync initiated', { syncJobId, userId });

    res.json({
      message: 'Base data sync initiated',
      syncJobId,
      statusUrl: `/api/sync/status/${syncJobId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Trigger event types sync
router.post('/event-types', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const syncJobId = await syncManager.startSync('event-types', userId);

    logger.info('Event types sync initiated', { syncJobId, userId });

    res.json({
      message: 'Event types sync initiated',
      syncJobId,
      statusUrl: `/api/sync/status/${syncJobId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Trigger events sync
router.post('/events', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const syncJobId = await syncManager.startSync('events', userId);

    logger.info('Events sync initiated', { syncJobId, userId });

    res.json({
      message: 'Events sync initiated',
      syncJobId,
      statusUrl: `/api/sync/status/${syncJobId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Trigger badges sync
router.post('/badges', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const syncJobId = await syncManager.startSync('badges', userId);

    logger.info('Badges sync initiated', { syncJobId, userId });

    res.json({
      message: 'Badges sync initiated',
      syncJobId,
      statusUrl: `/api/sync/status/${syncJobId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Trigger tickets sync
router.post('/tickets', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const syncJobId = await syncManager.startSync('tickets', userId);

    logger.info('Tickets sync initiated', { syncJobId, userId });

    res.json({
      message: 'Tickets sync initiated',
      syncJobId,
      statusUrl: `/api/sync/status/${syncJobId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Trigger full sync (all data in correct order)
router.post('/all', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const syncJobId = await syncManager.startSync('all', userId);

    logger.info('Full sync initiated', { syncJobId, userId });

    res.json({
      message: 'Full sync initiated (base-data → event-types → events → badges → tickets)',
      syncJobId,
      statusUrl: `/api/sync/status/${syncJobId}`,
    });
  } catch (error) {
    next(error);
  }
});

// Get status of a specific sync job
router.get('/status/:jobId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const jobId = req.params.jobId as string;
    const syncJob = await syncManager.getSyncJobStatus(jobId);

    if (!syncJob) {
      res.status(404).json({ error: 'Sync job not found' });
      return;
    }

    res.json(syncJob);
  } catch (error) {
    next(error);
  }
});

// Get list of recent sync jobs
router.get('/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const limitStr = req.query.limit;
    const limit = limitStr && typeof limitStr === 'string' ? parseInt(limitStr) : 20;
    const syncJobs = await syncManager.getRecentSyncJobs(limit);

    res.json({ syncJobs });
  } catch (error) {
    next(error);
  }
});

// Get last successful sync time for each type
router.get('/last-syncs', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const lastSyncs = await syncManager.getLastSyncTimes();

    res.json(lastSyncs);
  } catch (error) {
    next(error);
  }
});

export default router;
