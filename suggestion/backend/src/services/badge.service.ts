import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { tteApiService } from './tte-api.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class BadgeService {
  async getAllBadges(filters?: { badgeTypeId?: string; checkedIn?: boolean }) {
    // Fetch badges
    const badges = await prisma.badge.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });

    // Fetch all badge types
    const badgeTypes = await prisma.badgeType.findMany({
      select: { id: true, name: true }
    });

    // Create a map for quick lookup
    const badgeTypeMap = new Map(badgeTypes.map(bt => [bt.id, bt.name]));

    // Manually join badge type names
    return badges.map(badge => ({
      ...badge,
      badgeType: badge.badgeTypeId ? { name: badgeTypeMap.get(badge.badgeTypeId) } : null
    }));
  }

  async getBadgeById(id: string) {
    const badge = await prisma.badge.findUnique({
      where: { id },
      include: {
        badgeLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!badge) {
      throw new AppError('Badge not found', 404);
    }

    return badge;
  }

  async createBadge(data: any) {
    return await prisma.badge.create({
      data
    });
  }

  async updateBadge(id: string, data: any) {
    return await prisma.badge.update({
      where: { id },
      data
    });
  }

  async checkInBadge(id: string) {
    // 1. Update TTE API first (source of truth)
    try {
      await tteApiService.checkInBadge(id);
    } catch (error: any) {
      logger.error(`Failed to check in badge ${id} on TTE`, { error: error.message });
      throw new AppError(`Failed to check in badge on Tabletop.Events: ${error.message}`, 500);
    }

    // 2. Update local database only if TTE succeeded
    return await prisma.badge.update({
      where: { id },
      data: { checkedIn: true }
    });
  }

  async reverseCheckInBadge(id: string) {
    // 1. Update TTE API first (source of truth)
    try {
      await tteApiService.reverseCheckInBadge(id);
    } catch (error: any) {
      logger.error(`Failed to reverse check-in for badge ${id} on TTE`, { error: error.message });
      throw new AppError(`Failed to reverse check-in on Tabletop.Events: ${error.message}`, 500);
    }

    // 2. Update local database only if TTE succeeded
    return await prisma.badge.update({
      where: { id },
      data: { checkedIn: false }
    });
  }

  async addBadgeLog(badgeId: string, data: { commenterName: string; comment: string; type: string }) {
    return await prisma.badgeLog.create({
      data: {
        badgeId,
        ...data
      }
    });
  }

  async getBadgeTypes() {
    return await prisma.badgeType.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getBadgeTypeById(id: string) {
    const badgeType = await prisma.badgeType.findUnique({
      where: { id }
    });

    if (!badgeType) {
      throw new AppError('Badge type not found', 404);
    }

    return badgeType;
  }
}
