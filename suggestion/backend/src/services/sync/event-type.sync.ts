import { BaseSyncService, SyncResult, SyncProgress } from './base.sync';
import { logger } from '../../utils/logger';

interface TTEEventType {
  id: string;
  name: string;
  _relationships?: any;
  date_created?: string;
  date_updated?: string;
}

interface TTERoomEventType {
  eventtype_id: string;
  room_id?: string;
}

/**
 * Syncs event types and their room mappings
 */
export class EventTypeSyncService extends BaseSyncService {
  async sync(onProgress?: (progress: SyncProgress) => void, syncJobId?: string): Promise<SyncResult> {
    const startTime = new Date();
    let totalRecords = 0;
    const metadata: Record<string, any> = {};

    try {
      logger.info('Starting event type sync');

      // Step 1: Sync Event Types (0-50%)
      const step1Message = 'Syncing event types...';
      onProgress?.({ current: 50, total: 100, message: step1Message });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 50, 100, step1Message);
      }
      const eventTypeCount = await this.syncEventTypes();
      metadata.eventTypes = eventTypeCount;
      totalRecords += eventTypeCount;

      // Step 2: Sync Room-EventType mappings (50-100%)
      const step2Message = 'Syncing room-eventtype mappings...';
      onProgress?.({ current: 75, total: 100, message: step2Message });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 75, 100, step2Message);
      }
      const roomEventTypeCount = await this.syncRoomEventTypes();
      metadata.roomEventTypes = roomEventTypeCount;
      totalRecords += roomEventTypeCount;

      // Complete
      const completeMessage = `Synced ${eventTypeCount} event types and ${roomEventTypeCount} mappings`;
      onProgress?.({ current: 100, total: 100, message: completeMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 100, 100, completeMessage);
      }

      this.logSyncStats('event-types', totalRecords, startTime);

      return {
        success: true,
        recordCount: totalRecords,
        metadata,
      };
    } catch (error: any) {
      logger.error('Event type sync failed', { error: error.message });
      return {
        success: false,
        recordCount: totalRecords,
        error: error.message,
      };
    }
  }

  private async syncEventTypes(): Promise<number> {
    logger.info('Fetching event types from TTE API');

    const eventTypes = await this.tteApi.fetchAllPages<TTEEventType>('eventtypes');

    return await this.withTransaction(async (prisma) => {
      // Truncate and replace
      await this.truncateTable('event_types', prisma);

      // Insert all event types
      for (const eventType of eventTypes) {
        await prisma.eventType.create({
          data: {
            id: eventType.id,
            name: eventType.name,
            relationships: eventType._relationships || null,
          },
        });
      }

      logger.info(`Synced ${eventTypes.length} event types`);
      return eventTypes.length;
    });
  }

  private async syncRoomEventTypes(): Promise<number> {
    logger.info('Fetching room-eventtype mappings from TTE API');

    // Get all rooms from database (outside transaction)
    const rooms = await this.prisma.room.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Fetch all room-eventtype mappings from API (outside transaction)
    const allMappings: Array<{ roomId: string; eventTypeId: string }> = [];

    for (const room of rooms) {
      try {
        // The relationship endpoint is typically at /room/{id}/eventtypes
        const roomEventTypes = await this.tteApi.fetchCustomEndpoint<TTERoomEventType>(
          `/room/${room.id}/eventtypes`
        );

        // Collect mappings
        for (const mapping of roomEventTypes) {
          if (mapping.eventtype_id) {
            allMappings.push({
              roomId: room.id,
              eventTypeId: mapping.eventtype_id,
            });
          }
        }

        // Rate limiting - be nice to the API
        await this.delay(250);
      } catch (error: any) {
        logger.warn(`Failed to fetch event types for room ${room.name}`, { error: error.message });
        // Continue with other rooms
      }
    }

    // Now do all database writes in a single transaction
    return await this.withTransaction(async (prisma) => {
      // Truncate the mapping table
      await this.truncateTable('room_eventtypes', prisma);

      // Insert all mappings
      for (const mapping of allMappings) {
        await prisma.roomEventType.create({
          data: mapping,
        });
      }

      logger.info(`Synced ${allMappings.length} room-eventtype mappings`);
      return allMappings.length;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
