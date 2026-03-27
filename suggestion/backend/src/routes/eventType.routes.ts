import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ data: eventTypes });
  } catch (error) {
    next(error);
  }
});

export default router;
