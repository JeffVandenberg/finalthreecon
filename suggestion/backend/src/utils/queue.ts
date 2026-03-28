import Bull from 'bull';
import { logger } from './logger';

// Redis configuration
// Support both full Redis URL and separate host/port/password
const redisUrl = process.env.REDIS_URL;

const redisConfig = redisUrl
  ? redisUrl // Use full URL if provided (for Upstash rediss://)
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_HOST?.includes('upstash.io')
        ? { rejectUnauthorized: false }
        : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 30000,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

// Log Redis configuration (mask password)
logger.info('Initializing Bull queue with Redis config:',
  typeof redisConfig === 'string'
    ? { url: redisConfig.substring(0, 20) + '...' }
    : {
        host: redisConfig.host,
        port: redisConfig.port,
        tls: !!redisConfig.tls,
        hasPassword: !!redisConfig.password,
      }
);

// Create sync queue
export const syncQueue = new Bull('sync-jobs', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
});

// Queue event listeners
syncQueue.on('error', (error) => {
  logger.error('Bull queue error:', { error: error.message, stack: error.stack });
});

syncQueue.on('ready', () => {
  logger.info('Bull queue connected to Redis successfully');
});

syncQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, {
    jobId: job.id,
    type: job.data.type,
    error: error.message
  });
});

syncQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed:`, {
    jobId: job.id,
    type: job.data.type
  });
});

syncQueue.on('active', (job) => {
  logger.info(`Job ${job.id} started:`, {
    jobId: job.id,
    type: job.data.type
  });
});

export interface SyncJobData {
  type: 'base-data' | 'event-types' | 'events' | 'badges' | 'tickets' | 'all';
  syncJobId: string; // Database ID for tracking
  userId: string; // User who initiated the sync
  options?: {
    fullSync?: boolean;
    entities?: string[]; // For 'all' type, which entities to sync
  };
}

/**
 * Add a sync job to the queue
 */
export async function addSyncJob(data: SyncJobData): Promise<Bull.Job<SyncJobData>> {
  const job = await syncQueue.add(data, {
    jobId: data.syncJobId, // Use database ID as job ID for easy tracking
    priority: data.type === 'all' ? 1 : 5, // 'all' jobs have lower priority
  });

  logger.info(`Added sync job to queue:`, {
    jobId: job.id,
    type: data.type
  });

  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<any> {
  const job = await syncQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress();
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Clean old jobs from the queue
 */
export async function cleanOldJobs(): Promise<void> {
  const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours

  await syncQueue.clean(gracePeriod, 'completed');
  await syncQueue.clean(gracePeriod, 'failed');

  logger.info('Cleaned old jobs from queue');
}

/**
 * Gracefully close the queue
 */
export async function closeQueue(): Promise<void> {
  await syncQueue.close();
  logger.info('Sync queue closed');
}
