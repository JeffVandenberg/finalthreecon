import request from 'supertest';
import express from 'express';
import badgeRoutes from '../../src/routes/badge.routes';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/badges', badgeRoutes);

const mockPrisma = new PrismaClient() as any;

describe('Badge Routes Integration', () => {
  beforeEach(() => {

    // Mock authentication middleware to always pass
    jest.spyOn(require('../../src/middleware/auth'), 'authenticate')
      .mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 'user-1', email: 'test@example.com', role: 'admin' };
        next();
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /badges', () => {
    it('should return list of badges', async () => {
      const mockBadges = [
        {
          id: '1',
          name: 'Badge 1',
          badgeType: { name: 'Weekend' },
          tickets: [],
        },
      ];

      mockPrisma.badge.findMany.mockResolvedValue(mockBadges);

      const response = await request(app).get('/badges');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockBadges);
    });

    it('should filter badges by badgeTypeId', async () => {
      const mockBadges = [{ id: '1', badgeTypeId: 'type-1' }];
      mockPrisma.badge.findMany.mockResolvedValue(mockBadges);

      await request(app).get('/badges?badgeTypeId=type-1');

      expect(mockPrisma.badge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { badgeTypeId: 'type-1' },
        })
      );
    });
  });

  describe('GET /badges/:id', () => {
    it('should return badge by id', async () => {
      const mockBadge = {
        id: '1',
        name: 'Badge 1',
        badgeType: {},
        tickets: [],
        badgeLogs: [],
      };

      mockPrisma.badge.findUnique.mockResolvedValue(mockBadge);

      const response = await request(app).get('/badges/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockBadge);
    });

    it('should return 404 for non-existent badge', async () => {
      mockPrisma.badge.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/badges/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /badges/:id/check-in', () => {
    it('should check in a badge', async () => {
      const mockBadge = { id: '1', checkedIn: true };
      mockPrisma.badge.update.mockResolvedValue(mockBadge);

      const response = await request(app).post('/badges/1/check-in');

      expect(response.status).toBe(200);
      expect(response.body.data.checkedIn).toBe(true);
      expect(response.body.message).toBe('Badge checked in successfully');
    });
  });
});
