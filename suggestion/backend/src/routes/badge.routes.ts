import { Router } from 'express';
import { BadgeService } from '../services/badge.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const badgeService = new BadgeService();

// Get all badges
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { badgeTypeId, checkedIn } = req.query;
    const badges = await badgeService.getAllBadges({
      badgeTypeId: badgeTypeId as string,
      checkedIn: checkedIn !== undefined ? checkedIn === 'true' : undefined
    });
    res.json({ data: badges });
  } catch (error) {
    next(error);
  }
});

// Get badge by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const badge = await badgeService.getBadgeById(req.params.id as string);
    res.json({ data: badge });
  } catch (error) {
    next(error);
  }
});

// Create badge
router.post('/', authenticate, async (req, res, next) => {
  try {
    const badge = await badgeService.createBadge(req.body);
    res.status(201).json({ data: badge });
  } catch (error) {
    next(error);
  }
});

// Update badge
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const badge = await badgeService.updateBadge(req.params.id as string, req.body);
    res.json({ data: badge });
  } catch (error) {
    next(error);
  }
});

// Check in badge
router.put('/:id/check-in', authenticate, async (req, res, next) => {
  try {
    const badge = await badgeService.checkInBadge(req.params.id as string);
    res.json({ data: badge, message: 'Badge checked in successfully' });
  } catch (error) {
    next(error);
  }
});

// Reverse check-in badge
router.put('/:id/reverse-check-in', authenticate, async (req, res, next) => {
  try {
    const badge = await badgeService.reverseCheckInBadge(req.params.id as string);
    res.json({ data: badge, message: 'Badge check-in reversed successfully' });
  } catch (error) {
    next(error);
  }
});

// Add badge log
router.post('/:id/logs', authenticate, async (req, res, next) => {
  try {
    const log = await badgeService.addBadgeLog(req.params.id as string, req.body);
    res.status(201).json({ data: log });
  } catch (error) {
    next(error);
  }
});

// Get all badge types
router.get('/types/all', async (req, res, next) => {
  try {
    const badgeTypes = await badgeService.getBadgeTypes();
    res.json({ data: badgeTypes });
  } catch (error) {
    next(error);
  }
});

// Get badge type by ID
router.get('/types/:id', async (req, res, next) => {
  try {
    const badgeType = await badgeService.getBadgeTypeById(req.params.id as string);
    res.json({ data: badgeType });
  } catch (error) {
    next(error);
  }
});

export default router;
