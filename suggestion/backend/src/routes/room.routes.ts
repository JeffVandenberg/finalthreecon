import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        roomEventTypes: {
          include: {
            eventType: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: rooms });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id as string },
      include: {
        roomEventTypes: {
          include: {
            eventType: true
          }
        },
        events: {
          include: {
            eventType: true,
            startDaypart: true
          }
        }
      }
    });
    res.json({ data: room });
  } catch (error) {
    next(error);
  }
});

export default router;
