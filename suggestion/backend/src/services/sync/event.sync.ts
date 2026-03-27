import { BaseSyncService, SyncResult, SyncProgress } from './base.sync';
import { logger } from '../../utils/logger';

interface TTEEvent {
  id: string;
  room_id?: string;
  space_id?: string;
  space_name?: string;
  room_name?: string;
  name: string;
  event_number: number;
  type_id: string;
  description?: string;
  view_uri?: string;
  startdaypart_id?: string;
  duration: number;
  hosts?: any[];
  custom_fields?: any;
  _relationships?: any;
  multi_spaces?: string[]; // For events spanning multiple spaces
  date_created: string;
  date_updated: string;
}

/**
 * Syncs events with support for multi-space events
 */
export class EventSyncService extends BaseSyncService {
  async sync(onProgress?: (progress: SyncProgress) => void, syncJobId?: string): Promise<SyncResult> {
    const startTime = new Date();
    let totalRecords = 0;
    const metadata: Record<string, any> = {
      singleSpaceEvents: 0,
      multiSpaceEvents: 0,
      unassignedEvents: 0,
    };

    try {
      logger.info('Starting event sync');

      // Phase 1: Fetching (0-80%)
      const startMessage = 'Starting event sync...';
      onProgress?.({ current: 0, total: 100, message: startMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 0, 100, startMessage);
      }

      const events = await this.tteApi.fetchAllPages<TTEEvent>('events', {
        include: ['hosts', 'multi_spaces'], // Include hosts and multi_spaces from TTE API
        includeRelationships: true,
        onProgress: async (page, totalPages) => {
          // Calculate progress: 0-80% range for fetching
          const fetchProgress = Math.round((page / totalPages) * 80);
          const message = `Fetching events (page ${page}/${totalPages})...`;

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
      const processingMessage = 'Processing events...';
      onProgress?.({ current: 80, total: 100, message: processingMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 80, 100, processingMessage);
      }

      // Get space lookup map for multi-space events
      const spaceMap = await this.buildSpaceMap();

      totalRecords = await this.withTransaction(async (prisma) => {
        // Truncate and replace
        await this.truncateTable('events', prisma);

        let recordCount = 0;
        const unassignedEvents: string[] = [];

        for (const event of events) {
          // Extract event type ID from relationships
          const eventTypeId = event._relationships?.type
            ? event._relationships.type.replace('/api/eventtype/', '')
            : event.type_id;

          // Handle single-space events
          if (event.space_id) {
            await this.insertEvent(prisma, event, event.space_id, event.room_id, eventTypeId);
            recordCount++;
            metadata.singleSpaceEvents++;
          }
          // Handle multi-space events (create duplicate entries for each space)
          else if (event.multi_spaces && event.multi_spaces.length > 0) {
            for (const spaceName of event.multi_spaces) {
              const spaceInfo = spaceMap[spaceName];

              if (spaceInfo) {
                await this.insertEvent(
                  prisma,
                  event,
                  spaceInfo.spaceId,
                  spaceInfo.roomId,
                  eventTypeId
                );
                recordCount++;
              } else {
                logger.warn(`Space not found for multi-space event`, {
                  eventId: event.id,
                  spaceName,
                });
              }
            }
            metadata.multiSpaceEvents++;
          }
          // Events without space assignment
          else {
            unassignedEvents.push(event.id);
            metadata.unassignedEvents++;
            logger.warn(`Event has no space assignment`, {
              eventId: event.id,
              eventName: event.name,
            });
          }
        }

        if (unassignedEvents.length > 0) {
          logger.info(`${unassignedEvents.length} events skipped (no space assignment)`);
        }

        logger.info(`Synced ${recordCount} event records from ${events.length} unique events`);
        return recordCount;
      });

      // Complete
      const completeMessage = `Synced ${totalRecords} events`;
      onProgress?.({ current: 100, total: 100, message: completeMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 100, 100, completeMessage);
      }

      this.logSyncStats('events', totalRecords, startTime);

      return {
        success: true,
        recordCount: totalRecords,
        metadata,
      };
    } catch (error: any) {
      logger.error('Event sync failed', { error: error.message });
      return {
        success: false,
        recordCount: totalRecords,
        error: error.message,
      };
    }
  }

  private async insertEvent(
    prisma: any,
    event: TTEEvent,
    spaceId: string,
    roomId: string | undefined,
    eventTypeId: string
  ): Promise<void> {
    // Find a default room if not provided
    if (!roomId) {
      const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: { rooms: { take: 1 } },
      });
      roomId = space?.rooms[0]?.id;
    }

    if (!roomId) {
      logger.warn(`No room found for event ${event.id}, skipping`);
      return;
    }

    // Log hosts data for debugging
    if (event.event_number === 362) {
      logger.info(`Event #362 hosts data:`, {
        eventId: event.id,
        hasHosts: !!event.hosts,
        hostsIsArray: Array.isArray(event.hosts),
        hostsLength: event.hosts?.length,
        hostsValue: event.hosts
      });
    }

    await prisma.event.create({
      data: {
        id: event.id,
        roomId: roomId,
        spaceId: spaceId,
        eventTypeId: eventTypeId,
        startDaypartId: event.startdaypart_id || null,
        name: event.name,
        eventNumber: event.event_number,
        description: event.description || '',
        viewUri: event.view_uri || null,
        duration: event.duration,
        hosts: event.hosts || [],
        customFields: event.custom_fields || {},
        relationships: event._relationships || {},
        createdAt: new Date(event.date_created),
        updatedAt: new Date(event.date_updated),
      },
    });
  }

  private async buildSpaceMap(): Promise<Record<string, { spaceId: string; roomId: string }>> {
    const spaces = await this.prisma.space.findMany({
      include: {
        room: true, // Space belongs to one Room
      },
    });

    const spaceMap: Record<string, { spaceId: string; roomId: string }> = {};

    for (const space of spaces) {
      spaceMap[space.name] = {
        spaceId: space.id,
        roomId: space.room.id,
      };
    }

    return spaceMap;
  }
}
