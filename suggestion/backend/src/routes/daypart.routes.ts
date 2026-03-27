import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const dayparts = await prisma.daypart.findMany({
      orderBy: { startDate: 'asc' }
    });
    res.json({ data: dayparts });
  } catch (error) {
    next(error);
  }
});

export default router;
