import { BaseSyncService, SyncResult, SyncProgress } from './base.sync';
import { logger } from '../../utils/logger';

interface TTESpace {
  id: string;
  name: string;
  room_id?: string;
  _relationships?: any;
  date_created: string;
  date_updated: string;
}

interface TTERoom {
  id: string;
  name: string;
  description?: string;
  available_dayparts?: Record<string, { name: string; start_date: string }>;
  _relationships?: any;
  date_created: string;
  date_updated: string;
}

interface TTEDaypart {
  id: string;
  name: string;
  start_date: string;
  end_date?: string;
  date_created?: string;
  date_updated?: string;
}

interface TTEBadgeType {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  max_quantity: number;
  available_quantity: number;
  sellable: boolean;
  private: boolean;
  custom_fields: any;
  early_access_date?: string;
  allow_event_submissions: boolean;
  ticket_purchases_allowed: boolean;
}

/**
 * Syncs base reference data: Badge Types, Dayparts, Rooms, and Spaces
 * This should be run first as other entities depend on this data
 */
export class BaseDataSyncService extends BaseSyncService {
  private syncJobId?: string;

  async sync(onProgress?: (progress: SyncProgress) => void, syncJobId?: string): Promise<SyncResult> {
    this.syncJobId = syncJobId;
    const startTime = new Date();
    let totalRecords = 0;
    const metadata: Record<string, any> = {};

    try {
      logger.info('Starting base data sync (Badge Types, Dayparts, Rooms, Spaces)');

      // Step 1: Sync Badge Types (no dependencies)
      await this.reportProgress(1, 4, 'Syncing badge types...', onProgress);
      const badgeTypeCount = await this.syncBadgeTypes();
      metadata.badgeTypes = badgeTypeCount;
      totalRecords += badgeTypeCount;

      // Step 2: Sync Dayparts (no dependencies)
      await this.reportProgress(2, 4, 'Syncing dayparts...', onProgress);
      const daypartCount = await this.syncDayparts();
      metadata.dayparts = daypartCount;
      totalRecords += daypartCount;

      // Step 3: Sync Rooms (room_dayparts depend on dayparts from step 2)
      await this.reportProgress(3, 4, 'Syncing rooms...', onProgress);
      const { roomCount, roomDaypartCount } = await this.syncRooms();
      metadata.rooms = roomCount;
      metadata.roomDayparts = roomDaypartCount;
      totalRecords += roomCount + roomDaypartCount;

      // Step 4: Sync Spaces (depends on rooms from step 3 via room_id FK)
      await this.reportProgress(4, 4, 'Syncing spaces...', onProgress);
      const spaceCount = await this.syncSpaces();
      metadata.spaces = spaceCount;
      totalRecords += spaceCount;


      this.logSyncStats('base-data', totalRecords, startTime);

      return {
        success: true,
        recordCount: totalRecords,
        metadata,
      };
    } catch (error: any) {
      logger.error('Base data sync failed', { error: error.message });
      return {
        success: false,
        recordCount: totalRecords,
        error: error.message,
      };
    }
  }

  private async reportProgress(
    current: number,
    total: number,
    message: string,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    onProgress?.({ current, total, message });

    if (this.syncJobId) {
      const percentage = Math.round((current / total) * 100);
      await this.updateSyncJobProgress(this.syncJobId, percentage, 100, message);
    }
  }

  private async syncSpaces(): Promise<number> {
    logger.info('Fetching spaces from TTE API');

    const spaces = await this.tteApi.fetchAllPages<TTESpace>('spaces');

    return await this.withTransaction(async (prisma) => {
      // Note: spaces table is already truncated in syncRooms() due to FK dependency

      // Build a set of valid room IDs for validation
      const validRooms = await prisma.room.findMany({
        select: { id: true },
      });
      const validRoomIds = new Set(validRooms.map((r: { id: string }) => r.id));
      logger.info(`Found ${validRoomIds.size} valid rooms for space validation`);

      let skippedSpaces = 0;

      // Insert all spaces
      for (const space of spaces) {
        // Validate room exists
        if (!space.room_id) {
          logger.warn(`Space ${space.name} has no room_id, skipping`);
          skippedSpaces++;
          continue;
        }

        if (!validRoomIds.has(space.room_id)) {
          logger.warn(`Room ${space.room_id} not found for space ${space.name}, skipping`);
          skippedSpaces++;
          continue;
        }

        await prisma.space.create({
          data: {
            id: space.id,
            name: space.name,
            roomId: space.room_id,
            relationships: space._relationships || {},
            createdAt: new Date(space.date_created),
            updatedAt: new Date(space.date_updated),
          },
        });
      }

      logger.info(`Synced ${spaces.length - skippedSpaces} spaces (${skippedSpaces} skipped due to missing/invalid room_id)`);
      return spaces.length - skippedSpaces;
    });
  }

  private async syncRooms(): Promise<{ roomCount: number; roomDaypartCount: number }> {
    logger.info('Fetching rooms from TTE API');

    const rooms = await this.tteApi.fetchAllPages<TTERoom>('rooms');

    return await this.withTransaction(async (prisma) => {
      // Truncate tables in correct order (spaces must be cleared first due to FK)
      await this.truncateTable('spaces', prisma);
      await this.truncateTable('room_dayparts', prisma);
      await this.truncateTable('rooms', prisma);

      // Build a set of valid daypart IDs for validation
      const validDayparts = await prisma.daypart.findMany({
        select: { id: true },
      });
      const validDaypartIds = new Set(validDayparts.map((d: { id: string }) => d.id));
      logger.info(`Found ${validDaypartIds.size} valid dayparts for room-daypart mapping validation`);

      let roomDaypartCount = 0;
      let skippedMappings = 0;

      // Insert rooms and their dayparts
      for (const room of rooms) {
        // Create room directly (no space_id - spaces reference rooms, not vice versa)
        await prisma.room.create({
          data: {
            id: room.id,
            name: room.name,
            description: room.description || null,
            relationships: room._relationships || {},
            createdAt: new Date(room.date_created),
            updatedAt: new Date(room.date_updated),
          },
        });

        // Insert available dayparts for this room
        if (room.available_dayparts) {
          for (const [daypartId, daypartInfo] of Object.entries(room.available_dayparts)) {
            // Validate daypart exists before creating mapping
            if (!validDaypartIds.has(daypartId)) {
              logger.warn(
                `Daypart ${daypartId} not found in database for room ${room.name}, skipping mapping`
              );
              skippedMappings++;
              continue;
            }

            await prisma.roomDaypart.create({
              data: {
                roomId: room.id,
                daypartId: daypartId,
                name: (daypartInfo as any).name || '',
                startDate: new Date((daypartInfo as any).start_date || Date.now()),
              },
            });
            roomDaypartCount++;
          }
        }
      }

      logger.info(
        `Synced ${rooms.length} rooms with ${roomDaypartCount} room-daypart mappings (${skippedMappings} skipped due to missing dayparts)`
      );
      return { roomCount: rooms.length, roomDaypartCount };
    });
  }

  private async syncDayparts(): Promise<number> {
    logger.info('Fetching dayparts from TTE API');

    const dayparts = await this.tteApi.fetchAllPages<TTEDaypart>('dayparts');

    return await this.withTransaction(async (prisma) => {
      // Truncate and replace
      await this.truncateTable('dayparts', prisma);

      // Insert all dayparts
      for (const daypart of dayparts) {
        // Extract day name from the daypart name (e.g., "Friday Evening" -> "Friday")
        const dayName = daypart.name.split(' ')[0];

        const startDate = new Date(daypart.start_date);

        await prisma.daypart.create({
          data: {
            id: daypart.id,
            name: daypart.name,
            dayName: dayName,
            startDate: startDate,
          },
        });
      }

      logger.info(`Synced ${dayparts.length} dayparts`);
      return dayparts.length;
    });
  }

  private async syncBadgeTypes(): Promise<number> {
    logger.info('Fetching badge types from TTE API');

    const badgeTypes = await this.tteApi.fetchAllPages<TTEBadgeType>('badgetypes');

    return await this.withTransaction(async (prisma) => {
      // Truncate and replace
      await this.truncateTable('badge_types', prisma);

      // Insert all badge types
      for (const badgeType of badgeTypes) {
        await prisma.badgeType.create({
          data: {
            id: badgeType.id,
            name: badgeType.name,
            description: badgeType.description || null,
            price: badgeType.price,
            maxQuantity: badgeType.max_quantity,
            availableQuantity: badgeType.available_quantity,
            sellable: Boolean(badgeType.sellable),
            private: Boolean(badgeType.private),
            customFields: badgeType.custom_fields || {},
            earlyAccessDate: badgeType.early_access_date ? new Date(badgeType.early_access_date) : null,
            allowEventSubmissions: Boolean(badgeType.allow_event_submissions),
            ticketPurchasesAllowed: Boolean(badgeType.ticket_purchases_allowed),
          },
        });
      }

      logger.info(`Synced ${badgeTypes.length} badge types`);
      return badgeTypes.length;
    });
  }
}
