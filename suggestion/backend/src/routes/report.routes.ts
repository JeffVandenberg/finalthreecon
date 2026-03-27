import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Badge summary report
router.get('/badge-summary', authenticate, async (req, res, next) => {
  try {
    // Fetch badge types and badges separately (no FK relation)
    const [badgeTypes, badges] = await Promise.all([
      prisma.badgeType.findMany(),
      prisma.badge.findMany({ select: { badgeTypeId: true, checkedIn: true } })
    ]);

    // Group badges by badge type
    const badgesByType = new Map<string, typeof badges>();
    badges.forEach(badge => {
      if (!badgesByType.has(badge.badgeTypeId)) {
        badgesByType.set(badge.badgeTypeId, []);
      }
      badgesByType.get(badge.badgeTypeId)!.push(badge);
    });

    const summary = badgeTypes.map(bt => {
      const typeBadges = badgesByType.get(bt.id) || [];
      return {
        name: bt.name,
        total: bt.maxQuantity,
        sold: typeBadges.length,
        available: bt.availableQuantity,
        checkedIn: typeBadges.filter(b => b.checkedIn).length
      };
    });

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

// Event capacity report
router.get('/event-capacity', authenticate, async (req, res, next) => {
  try {
    // Fetch events and related data separately (no FK relations)
    const [events, eventTypes, rooms, tickets] = await Promise.all([
      prisma.event.findMany(),
      prisma.eventType.findMany({ select: { id: true, name: true } }),
      prisma.room.findMany({ select: { id: true, name: true } }),
      prisma.ticket.findMany({ select: { eventId: true } })
    ]);

    // Create lookup maps
    const eventTypeMap = new Map(eventTypes.map(et => [et.id, et.name]));
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));

    // Count tickets per event
    const ticketsByEvent = new Map<string, number>();
    tickets.forEach(ticket => {
      ticketsByEvent.set(ticket.eventId, (ticketsByEvent.get(ticket.eventId) || 0) + 1);
    });

    const report = events.map(event => {
      const capacity = event.customFields && typeof event.customFields === 'object'
        ? (event.customFields as any).capacity || 'N/A'
        : 'N/A';

      const registered = ticketsByEvent.get(event.id) || 0;

      return {
        name: event.name,
        eventType: eventTypeMap.get(event.eventTypeId) || 'Unknown',
        room: roomMap.get(event.roomId) || 'Unknown',
        capacity,
        registered,
        available: capacity === 'N/A' ? 'N/A' : capacity - registered
      };
    });

    res.json({ data: report });
  } catch (error) {
    next(error);
  }
});

export default router;
