import { BadgeService } from '../../../src/services/badge.service';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../src/middleware/errorHandler';

const mockPrisma = new PrismaClient() as any;

describe('BadgeService', () => {
  let badgeService: BadgeService;

  beforeEach(() => {
    badgeService = new BadgeService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllBadges', () => {
    it('should return all badges with filters', async () => {
      const mockBadges = [
        {
          id: '1',
          badgeTypeId: 'type-1',
          badgeNumber: 1,
          name: 'John Doe',
          checkedIn: false,
          badgeType: { id: 'type-1', name: 'Weekend' },
          tickets: [],
        },
      ];

      mockPrisma.badge.findMany.mockResolvedValue(mockBadges);

      const result = await badgeService.getAllBadges({ badgeTypeId: 'type-1' });

      expect(result).toEqual(mockBadges);
      expect(mockPrisma.badge.findMany).toHaveBeenCalledWith({
        where: { badgeTypeId: 'type-1' },
        include: {
          badgeType: true,
          tickets: {
            include: {
              event: {
                include: {
                  eventType: true,
                  room: true,
                  space: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return all badges without filters', async () => {
      const mockBadges = [{ id: '1', name: 'Badge 1' }];
      mockPrisma.badge.findMany.mockResolvedValue(mockBadges);

      const result = await badgeService.getAllBadges();

      expect(result).toEqual(mockBadges);
      expect(mockPrisma.badge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
        })
      );
    });
  });

  describe('getBadgeById', () => {
    it('should return badge by id', async () => {
      const mockBadge = {
        id: '1',
        name: 'John Doe',
        badgeType: { name: 'Weekend' },
        tickets: [],
        badgeLogs: [],
      };

      mockPrisma.badge.findUnique.mockResolvedValue(mockBadge);

      const result = await badgeService.getBadgeById('1');

      expect(result).toEqual(mockBadge);
      expect(mockPrisma.badge.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw error if badge not found', async () => {
      mockPrisma.badge.findUnique.mockResolvedValue(null);

      await expect(badgeService.getBadgeById('999')).rejects.toThrow(AppError);
      await expect(badgeService.getBadgeById('999')).rejects.toThrow(
        'Badge not found'
      );
    });
  });

  describe('createBadge', () => {
    it('should create a new badge', async () => {
      const badgeData = {
        badgeTypeId: 'type-1',
        badgeNumber: 1,
        name: 'John Doe',
        customFields: {},
      };

      const mockCreatedBadge = { id: '1', ...badgeData };
      mockPrisma.badge.create.mockResolvedValue(mockCreatedBadge);

      const result = await badgeService.createBadge(badgeData);

      expect(result).toEqual(mockCreatedBadge);
      expect(mockPrisma.badge.create).toHaveBeenCalledWith({
        data: badgeData,
        include: { badgeType: true },
      });
    });
  });

  describe('updateBadge', () => {
    it('should update a badge', async () => {
      const updateData = { name: 'Jane Doe' };
      const mockUpdatedBadge = { id: '1', name: 'Jane Doe' };

      mockPrisma.badge.update.mockResolvedValue(mockUpdatedBadge);

      const result = await badgeService.updateBadge('1', updateData);

      expect(result).toEqual(mockUpdatedBadge);
      expect(mockPrisma.badge.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        include: { badgeType: true },
      });
    });
  });

  describe('checkInBadge', () => {
    it('should check in a badge', async () => {
      const mockCheckedInBadge = { id: '1', checkedIn: true };
      mockPrisma.badge.update.mockResolvedValue(mockCheckedInBadge);

      const result = await badgeService.checkInBadge('1');

      expect(result).toEqual(mockCheckedInBadge);
      expect(mockPrisma.badge.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { checkedIn: true },
      });
    });
  });

  describe('addBadgeLog', () => {
    it('should add a log to a badge', async () => {
      const logData = {
        commenterName: 'Admin',
        comment: 'Checked in',
        type: 'check-in',
      };

      const mockLog = { id: 'log-1', badgeId: '1', ...logData };
      mockPrisma.badgeLog.create.mockResolvedValue(mockLog);

      const result = await badgeService.addBadgeLog('1', logData);

      expect(result).toEqual(mockLog);
      expect(mockPrisma.badgeLog.create).toHaveBeenCalledWith({
        data: {
          badgeId: '1',
          ...logData,
        },
      });
    });
  });

  describe('getBadgeTypes', () => {
    it('should return all badge types', async () => {
      const mockBadgeTypes = [
        { id: '1', name: 'Weekend' },
        { id: '2', name: 'VIP' },
      ];

      mockPrisma.badgeType.findMany.mockResolvedValue(
        mockBadgeTypes
      );

      const result = await badgeService.getBadgeTypes();

      expect(result).toEqual(mockBadgeTypes);
      expect(mockPrisma.badgeType.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getBadgeTypeById', () => {
    it('should return badge type by id', async () => {
      const mockBadgeType = {
        id: '1',
        name: 'Weekend',
        badges: [],
      };

      mockPrisma.badgeType.findUnique.mockResolvedValue(
        mockBadgeType
      );

      const result = await badgeService.getBadgeTypeById('1');

      expect(result).toEqual(mockBadgeType);
    });

    it('should throw error if badge type not found', async () => {
      mockPrisma.badgeType.findUnique.mockResolvedValue(null);

      await expect(badgeService.getBadgeTypeById('999')).rejects.toThrow(
        AppError
      );
      await expect(badgeService.getBadgeTypeById('999')).rejects.toThrow(
        'Badge type not found'
      );
    });
  });
});
