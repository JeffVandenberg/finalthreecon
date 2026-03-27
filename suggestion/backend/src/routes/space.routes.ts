import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const spaces = await prisma.space.findMany({
      include: {
        room: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: spaces });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const space = await prisma.space.findUnique({
      where: { id: req.params.id },
      include: {
        room: {
          include: {
            roomEventTypes: {
              include: {
                eventType: true
              }
            }
          }
        }
      }
    });
    res.json({ data: space });
  } catch (error) {
    next(error);
  }
});

export default router;
