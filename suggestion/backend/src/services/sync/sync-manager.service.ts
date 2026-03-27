import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { addSyncJob, SyncJobData } from '../../utils/queue';
import { BaseDataSyncService } from './base-data.sync';
import { EventTypeSyncService } from './event-type.sync';
import { EventSyncService } from './event.sync';
import { BadgeSyncService } from './badge.sync';
import { TicketSyncService } from './ticket.sync';

export type SyncType = 'base-data' | 'event-types' | 'events' | 'badges' | 'tickets' | 'all';

/**
 * Manages and orchestrates all sync operations
 */
export class SyncManagerService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize a sync job and add it to the queue
   */
  async startSync(type: SyncType, userId: string): Promise<string> {
    // Create sync job record in database
    const syncJob = await this.prisma.syncJob.create({
      data: {
        type,
        status: 'pending',
        progress: 0,
        userId,
      },
    });

    // Add job to Bull queue
    const jobData: SyncJobData = {
      type,
      syncJobId: syncJob.id,
      userId,
    };

    await addSyncJob(jobData);

    logger.info(`Sync job created and queued`, {
      syncJobId: syncJob.id,
      type,
      userId,
    });

    return syncJob.id;
  }

  /**
   * Execute a specific sync type
   * This is called by the queue processor
   */
  async executeSync(
    type: SyncType,
    syncJobId: string,
    onProgress?: (current: number, total: number, message?: string) => void
  ): Promise<void> {
    try {
      // Mark job as active
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: { status: 'active' },
      });

      if (type === 'all') {
        await this.executeFullSync(syncJobId, onProgress);
      } else {
        await this.executeSingleSync(type, syncJobId, onProgress);
      }
    } catch (error: any) {
      logger.error(`Sync execution failed for job ${syncJobId}`, { error: error.message });

      // Mark job as failed
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single sync operation
   */
  private async executeSingleSync(
    type: Exclude<SyncType, 'all'>,
    syncJobId: string,
    onProgress?: (current: number, total: number, message?: string) => void
  ): Promise<void> {
    const service = this.getSyncService(type);

    const result = await service.sync((progress) => {
      if (onProgress) {
        onProgress(progress.current, progress.total, progress.message);
      }
    }, syncJobId);

    if (result.success) {
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: 'completed',
          recordCount: result.recordCount,
          metadata: result.metadata || {},
          completedAt: new Date(),
        },
      });
    } else {
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: 'failed',
          error: result.error || 'Unknown error',
          completedAt: new Date(),
        },
      });
    }

    await service.disconnect();
  }

  /**
   * Execute full sync (all entities in order)
   */
  private async executeFullSync(
    syncJobId: string,
    onProgress?: (current: number, total: number, message?: string) => void
  ): Promise<void> {
    const syncOrder: Exclude<SyncType, 'all'>[] = [
      'base-data',     // Must be first (spaces, rooms, dayparts)
      'event-types',   // Must be before events
      'events',        // Must be before tickets
      'badges',        // Must be before tickets
      'tickets',       // Last (depends on events and badges)
    ];

    const totalSteps = syncOrder.length;
    let currentStep = 0;
    let totalRecords = 0;
    const metadata: Record<string, any> = {};

    for (const syncType of syncOrder) {
      currentStep++;
      onProgress?.(currentStep, totalSteps, `Syncing ${syncType}...`);

      logger.info(`Full sync: executing ${syncType} (${currentStep}/${totalSteps})`);

      const service = this.getSyncService(syncType);

      const result = await service.sync((progress) => {
        // Sub-progress reporting
        const overallProgress = ((currentStep - 1) / totalSteps) * 100 +
          (progress.current / progress.total) * (100 / totalSteps);

        onProgress?.(
          Math.round(overallProgress),
          100,
          `${syncType}: ${progress.message || ''}`
        );
      });

      await service.disconnect();

      if (!result.success) {
        throw new Error(`${syncType} sync failed: ${result.error}`);
      }

      totalRecords += result.recordCount;
      metadata[syncType] = {
        recordCount: result.recordCount,
        ...result.metadata,
      };

      // Update progress in database
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          progress: Math.round((currentStep / totalSteps) * 100),
          metadata,
        },
      });
    }

    // Mark as completed
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: 'completed',
        progress: 100,
        recordCount: totalRecords,
        metadata,
        completedAt: new Date(),
      },
    });

    logger.info(`Full sync completed`, { syncJobId, totalRecords });
  }

  /**
   * Get the appropriate sync service for a type
   */
  private getSyncService(type: Exclude<SyncType, 'all'>) {
    switch (type) {
      case 'base-data':
        return new BaseDataSyncService();
      case 'event-types':
        return new EventTypeSyncService();
      case 'events':
        return new EventSyncService();
      case 'badges':
        return new BadgeSyncService();
      case 'tickets':
        return new TicketSyncService();
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(syncJobId: string) {
    return await this.prisma.syncJob.findUnique({
      where: { id: syncJobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get recent sync jobs
   */
  async getRecentSyncJobs(limit: number = 20) {
    return await this.prisma.syncJob.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get last successful sync for each type
   */
  async getLastSyncTimes() {
    const syncTypes: SyncType[] = ['base-data', 'event-types', 'events', 'badges', 'tickets', 'all'];
    const lastSyncs: Record<string, Date | null> = {};

    for (const type of syncTypes) {
      const lastSync = await this.prisma.syncJob.findFirst({
        where: {
          type,
          status: 'completed',
        },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });

      lastSyncs[type] = lastSync?.completedAt || null;
    }

    return lastSyncs;
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const syncManager = new SyncManagerService();
