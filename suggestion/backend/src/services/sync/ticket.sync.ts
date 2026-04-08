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

      // Pre-load valid event and badge IDs outside the transaction to avoid timeout
      const [eventRows, badgeRows] = await Promise.all([
        this.prisma.event.findMany({ select: { id: true } }),
        this.prisma.badge.findMany({ select: { id: true } }),
      ]);
      const validEventIds = new Set(eventRows.map((e: { id: string }) => e.id));
      const validBadgeIds = new Set(badgeRows.map((b: { id: string }) => b.id));
      logger.info(`Loaded ${validEventIds.size} event IDs and ${validBadgeIds.size} badge IDs for validation`);

      // Filter tickets before entering the transaction
      let skippedCount = 0;
      const validTickets = tickets.filter((ticket) => {
        if (!ticket.event_id || !ticket.badge_id) { skippedCount++; return false; }
        if (!validEventIds.has(ticket.event_id)) { skippedCount++; return false; }
        if (!validBadgeIds.has(ticket.badge_id)) { skippedCount++; return false; }
        return true;
      });

      if (skippedCount > 0) {
        logger.info(`Skipped ${skippedCount} tickets (missing event or badge references)`);
      }

      totalRecords = await this.withTransaction(async (prisma) => {
        await this.truncateTable('tickets', prisma);

        for (const ticket of validTickets) {
          await prisma.ticket.create({
            data: {
              id: ticket.id,
              eventId: ticket.event_id!,
              badgeId: ticket.badge_id!,
              relationships: ticket._relationships || {},
              createdAt: ticket.date_created ? new Date(ticket.date_created) : new Date(),
              updatedAt: ticket.date_updated ? new Date(ticket.date_updated) : new Date(),
            },
          });
        }

        logger.info(`Synced ${validTickets.length} tickets`);
        return validTickets.length;
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
