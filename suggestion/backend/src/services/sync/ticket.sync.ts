import { BaseSyncService, SyncResult, SyncProgress } from './base.sync';
import { logger } from '../../utils/logger';

interface TTETicket {
  id: string;
  event_id?: string;
  badge_id?: string;
  _relationships?: any;
  date_created?: string;
  date_updated?: string;
}

/**
 * Syncs tickets (event registrations)
 */
export class TicketSyncService extends BaseSyncService {
  async sync(onProgress?: (progress: SyncProgress) => void, syncJobId?: string): Promise<SyncResult> {
    const startTime = new Date();
    let totalRecords = 0;

    try {
      logger.info('Starting ticket sync');

      // Phase 1: Fetching (0-80%)
      const startMessage = 'Starting ticket sync...';
      onProgress?.({ current: 0, total: 100, message: startMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 0, 100, startMessage);
      }

      // Fetch all tickets with progress tracking
      const tickets = await this.tteApi.fetchAllPages<TTETicket>('tickets', {
        includeRelationships: true,
        onProgress: async (page, totalPages) => {
          // Calculate progress: 0-80% range for fetching
          const fetchProgress = Math.round((page / totalPages) * 80);
          const message = `Fetching tickets (page ${page}/${totalPages})...`;

          onProgress?.({
            current: fetchProgress,
            total: 100,
            message,
          });

          if (syncJobId) {
            await this.updateSyncJobProgress(syncJobId, fetchProgress, 100, message);
          }
        },
      });

      // Phase 2: Processing (80-100%)
      const processingMessage = 'Processing tickets...';
      onProgress?.({ current: 80, total: 100, message: processingMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 80, 100, processingMessage);
      }

      totalRecords = await this.withTransaction(async (prisma) => {
        // Truncate and replace
        await this.truncateTable('tickets', prisma);

        let insertedCount = 0;
        let skippedCount = 0;

        // Insert all tickets
        for (const ticket of tickets) {
          // Validate that both event and badge exist
          if (!ticket.event_id || !ticket.badge_id) {
            skippedCount++;
            continue;
          }

          // Check if event exists
          const eventExists = await prisma.event.findUnique({
            where: { id: ticket.event_id },
          });

          if (!eventExists) {
            logger.debug(`Event ${ticket.event_id} not found for ticket ${ticket.id}, skipping`);
            skippedCount++;
            continue;
          }

          // Check if badge exists
          const badgeExists = await prisma.badge.findUnique({
            where: { id: ticket.badge_id },
          });

          if (!badgeExists) {
            logger.debug(`Badge ${ticket.badge_id} not found for ticket ${ticket.id}, skipping`);
            skippedCount++;
            continue;
          }

          await prisma.ticket.create({
            data: {
              id: ticket.id,
              eventId: ticket.event_id,
              badgeId: ticket.badge_id,
              relationships: ticket._relationships || {},
              createdAt: ticket.date_created ? new Date(ticket.date_created) : new Date(),
              updatedAt: ticket.date_updated ? new Date(ticket.date_updated) : new Date(),
            },
          });

          insertedCount++;
        }

        if (skippedCount > 0) {
          logger.info(`Skipped ${skippedCount} tickets (missing event or badge references)`);
        }

        logger.info(`Synced ${insertedCount} tickets (${skippedCount} skipped)`);
        return insertedCount;
      });

      // Complete
      const completeMessage = `Synced ${totalRecords} tickets`;
      onProgress?.({ current: 100, total: 100, message: completeMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 100, 100, completeMessage);
      }

      this.logSyncStats('tickets', totalRecords, startTime);

      return {
        success: true,
        recordCount: totalRecords,
        metadata: {
          totalFetched: tickets.length,
          inserted: totalRecords,
          skipped: tickets.length - totalRecords,
        },
      };
    } catch (error: any) {
      logger.error('Ticket sync failed', { error: error.message });
      return {
        success: false,
        recordCount: totalRecords,
        error: error.message,
      };
    }
  }
}
