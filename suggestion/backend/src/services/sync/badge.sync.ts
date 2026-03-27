import { BaseSyncService, SyncResult, SyncProgress } from './base.sync';
import { logger } from '../../utils/logger';

interface TTEBadge {
  id: string;
  badgetype_id?: string;
  badge_number?: number;
  shortname?: string;
  name: string;
  custom_fields?: {
    BadgeDisplayName?: string;
    Pronouns?: string;
    DiscordName?: string;
    [key: string]: any;
  };
  user_id?: string;
  checked_in?: boolean;
  _relationships?: any;
  date_created: string;
  date_updated: string;
}

/**
 * Syncs badges (attendees) with custom fields
 */
export class BadgeSyncService extends BaseSyncService {
  async sync(onProgress?: (progress: SyncProgress) => void, syncJobId?: string): Promise<SyncResult> {
    const startTime = new Date();
    let totalRecords = 0;

    try {
      logger.info('Starting badge sync');

      // Phase 1: Fetching (0-80%)
      const startMessage = 'Starting badge sync...';
      onProgress?.({ current: 0, total: 100, message: startMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 0, 100, startMessage);
      }

      // Fetch all badges with progress tracking
      const badges = await this.tteApi.fetchAllPages<TTEBadge>('badges', {
        includeRelationships: true,
        onProgress: async (page, totalPages) => {
          // Calculate progress: 0-80% range for fetching
          const fetchProgress = Math.round((page / totalPages) * 80);
          const message = `Fetching badges (page ${page}/${totalPages})...`;

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
      const processingMessage = 'Processing badges...';
      onProgress?.({ current: 80, total: 100, message: processingMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 80, 100, processingMessage);
      }

      totalRecords = await this.withTransaction(async (prisma) => {
        // Get existing check-in statuses before truncating
        const existingBadges = await prisma.badge.findMany({
          select: { id: true, checkedIn: true }
        });

        const checkInStatusMap = new Map(
          existingBadges.map(b => [b.id, b.checkedIn])
        );

        // Truncate and replace
        await this.truncateTable('badges', prisma);

        // Insert all badges
        for (const badge of badges) {
          // Ensure badge has a valid badge type
          if (!badge.badgetype_id) {
            logger.warn(`Badge ${badge.id} has no badge type, skipping`);
            continue;
          }

          // Check if badge type exists
          const badgeTypeExists = await prisma.badgeType.findUnique({
            where: { id: badge.badgetype_id },
          });

          if (!badgeTypeExists) {
            logger.warn(`Badge type ${badge.badgetype_id} not found for badge ${badge.id}, skipping`);
            continue;
          }

          // Preserve local check-in status if it exists, otherwise use TTE value (or false)
          const preservedCheckInStatus = checkInStatusMap.get(badge.id) ?? (badge.checked_in || false);

          await prisma.badge.create({
            data: {
              id: badge.id,
              badgeTypeId: badge.badgetype_id,
              badgeNumber: badge.badge_number || 0,
              shortname: badge.shortname || null,
              name: badge.name,
              badgeDisplayName: badge.custom_fields?.BadgeDisplayName || null,
              pronouns: badge.custom_fields?.Pronouns || null,
              discordName: badge.custom_fields?.DiscordName || null,
              customFields: badge.custom_fields || {},
              userId: badge.user_id || null,
              checkedIn: preservedCheckInStatus,
              createdAt: new Date(badge.date_created),
              updatedAt: new Date(badge.date_updated),
            },
          });
        }

        logger.info(`Synced ${badges.length} badges`);
        return badges.length;
      });

      // Complete
      const completeMessage = `Synced ${totalRecords} badges`;
      onProgress?.({ current: 100, total: 100, message: completeMessage });
      if (syncJobId) {
        await this.updateSyncJobProgress(syncJobId, 100, 100, completeMessage);
      }

      this.logSyncStats('badges', totalRecords, startTime);

      return {
        success: true,
        recordCount: totalRecords,
      };
    } catch (error: any) {
      logger.error('Badge sync failed', { error: error.message });
      return {
        success: false,
        recordCount: totalRecords,
        error: error.message,
      };
    }
  }
}
