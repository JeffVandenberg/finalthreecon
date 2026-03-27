import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { tteApiService, TTEApiService } from '../tte-api.service';

export interface SyncResult {
  success: boolean;
  recordCount: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface SyncProgress {
  current: number;
  total: number;
  message?: string;
}

export abstract class BaseSyncService {
  protected prisma: PrismaClient;
  protected tteApi: TTEApiService;

  constructor() {
    this.prisma = new PrismaClient();
    this.tteApi = tteApiService;
  }

  /**
   * Abstract method that each sync service must implement
   */
  abstract sync(
    onProgress?: (progress: SyncProgress) => void,
    syncJobId?: string
  ): Promise<SyncResult>;

  /**
   * Update sync job progress in database
   */
  protected async updateSyncJobProgress(
    syncJobId: string,
    progress: number,
    total?: number,
    message?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          progress,
          total,
          message,
          metadata: metadata || undefined,
        },
      });
    } catch (error: any) {
      logger.warn('Failed to update sync job progress', { error: error.message, syncJobId });
    }
  }

  /**
   * Mark sync job as completed
   */
  protected async completeSyncJob(
    syncJobId: string,
    recordCount: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: 'completed',
        progress: 100,
        recordCount,
        metadata: metadata || undefined,
        completedAt: new Date(),
      },
    });

    logger.info(`Sync job ${syncJobId} completed with ${recordCount} records`);
  }

  /**
   * Mark sync job as failed
   */
  protected async failSyncJob(
    syncJobId: string,
    error: string
  ): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: 'failed',
        error,
        completedAt: new Date(),
      },
    });

    logger.error(`Sync job ${syncJobId} failed:`, { error });
  }

  /**
   * Execute a database operation within a transaction
   */
  protected async withTransaction<T>(
    operation: (prisma: any) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (prisma) => {
      return await operation(prisma);
    });
  }

  /**
   * Truncate a table (used for full sync)
   * Uses DELETE instead of TRUNCATE to enable transaction rollback and respect foreign keys
   * @param tableName - Name of the table to clear
   * @param prisma - Optional transaction prisma client (uses this.prisma if not provided)
   */
  protected async truncateTable(tableName: string, prisma?: any): Promise<void> {
    logger.info(`Clearing table: ${tableName}`);
    const client = prisma || this.prisma;
    await client.$executeRawUnsafe(`DELETE FROM ${tableName}`);
    // Note: Using DELETE instead of TRUNCATE for two important reasons:
    // 1. TRUNCATE causes implicit COMMIT in MySQL, breaking transaction rollback
    // 2. TRUNCATE fails with foreign key constraints, DELETE respects CASCADE
    // Trade-off: Slightly slower but much safer for production (prevents data loss on errors)
  }

  /**
   * Log sync statistics
   */
  protected logSyncStats(
    entityType: string,
    recordCount: number,
    startTime: Date
  ): void {
    const duration = Date.now() - startTime.getTime();
    const durationSeconds = (duration / 1000).toFixed(2);

    logger.info(`Sync completed for ${entityType}:`, {
      entityType,
      recordCount,
      durationSeconds: `${durationSeconds}s`,
    });
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
