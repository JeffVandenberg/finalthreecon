import { Job } from 'bull';
import { logger } from '../utils/logger';
import { syncQueue, SyncJobData } from '../utils/queue';
import { syncManager } from '../services/sync/sync-manager.service';

/**
 * Process sync jobs from the Bull queue
 */
syncQueue.process(async (job: Job<SyncJobData>) => {
  const { type, syncJobId, userId } = job.data;

  logger.info(`Processing sync job`, {
    jobId: job.id,
    syncJobId,
    type,
    userId,
  });

  try {
    // Execute the sync with progress reporting
    await syncManager.executeSync(type, syncJobId, (current, total, message) => {
      // Update Bull job progress
      job.progress({
        current,
        total,
        message,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
      });
    });

    logger.info(`Sync job completed successfully`, {
      jobId: job.id,
      syncJobId,
      type,
    });

    return {
      success: true,
      syncJobId,
      type,
    };
  } catch (error: any) {
    logger.error(`Sync job failed`, {
      jobId: job.id,
      syncJobId,
      type,
      error: error.message,
      stack: error.stack,
    });

    // Re-throw to mark job as failed in Bull
    throw error;
  }
});

// Handle job completion
syncQueue.on('completed', (job, result) => {
  logger.info(`Sync job completed`, {
    jobId: job.id,
    syncJobId: result.syncJobId,
    type: result.type,
  });
});

// Handle job failure
syncQueue.on('failed', (job, error) => {
  logger.error(`Sync job failed`, {
    jobId: job.id,
    syncJobId: job.data.syncJobId,
    type: job.data.type,
    error: error.message,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
  });
});

// Handle job stalled (stuck)
syncQueue.on('stalled', (job) => {
  logger.warn(`Sync job stalled`, {
    jobId: job.id,
    syncJobId: job.data.syncJobId,
    type: job.data.type,
  });
});

logger.info('Sync job processor initialized');

export default syncQueue;
