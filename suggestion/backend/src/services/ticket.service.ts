import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class TicketService {
  async createTicket(data: { badgeId: string; eventId: string; relationships?: any }) {
    // Check if event exists and get ticket count
    const [event, ticketCount] = await Promise.all([
      prisma.event.findUnique({ where: { id: data.eventId } }),
      prisma.ticket.count({ where: { eventId: data.eventId } })
    ]);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check capacity from custom fields if available
    const capacity = event.customFields && typeof event.customFields === 'object'
      ? (event.customFields as any).capacity
      : null;

    if (capacity && ticketCount >= capacity) {
      throw new AppError('Event is full', 400);
    }

    // Check if badge already has a ticket for this event
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        badgeId: data.badgeId,
        eventId: data.eventId
      }
    });

    if (existingTicket) {
      throw new AppError('Badge already registered for this event', 400);
    }

    // Just create and return - no includes
    return await prisma.ticket.create({
      data: {
        badgeId: data.badgeId,
        eventId: data.eventId,
        relationships: data.relationships || {}
      }
    });
  }

  async deleteTicket(id: string) {
    return await prisma.ticket.delete({
      where: { id }
    });
  }

  async getTicketsByBadge(badgeId: string) {
    // Fetch tickets without includes
    const tickets = await prisma.ticket.findMany({
      where: { badgeId }
    });

    if (tickets.length === 0) {
      return [];
    }

    // Fetch all related data
    const eventIds = tickets.map(t => t.eventId);
    const [events, eventTypes, rooms, spaces, dayparts] = await Promise.all([
      prisma.event.findMany({
        where: { id: { in: eventIds } }
      }),
      prisma.eventType.findMany({ select: { id: true, name: true } }),
      prisma.room.findMany({ select: { id: true, name: true } }),
      prisma.space.findMany({ select: { id: true, name: true } }),
      prisma.daypart.findMany({ select: { id: true, name: true, startDate: true } })
    ]);

    // Create lookup maps
    const eventTypeMap = new Map(eventTypes.map(et => [et.id, et]));
    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const spaceMap = new Map(spaces.map(s => [s.id, s]));
    const daypartMap = new Map(dayparts.map(d => [d.id, d]));

    // Create event map with joined relations
    const eventMap = new Map(
      events.map(event => [
        event.id,
        {
          ...event,
          eventType: eventTypeMap.get(event.eventTypeId) || null,
          room: roomMap.get(event.roomId) || null,
          space: spaceMap.get(event.spaceId) || null,
          startDaypart: event.startDaypartId ? daypartMap.get(event.startDaypartId) || null : null
        }
      ])
    );

    // Join tickets with events
    const ticketsWithEvents = tickets.map(ticket => ({
      ...ticket,
      event: eventMap.get(ticket.eventId) || null
    }));

    // Sort by startDate (replaces orderBy)
    return ticketsWithEvents.sort((a, b) => {
      const aDate = a.event?.startDaypart?.startDate?.getTime() || 0;
      const bDate = b.event?.startDaypart?.startDate?.getTime() || 0;
      return aDate - bDate;
    });
  }

  async getTicketsByEvent(eventId: string) {
    // Fetch tickets for this event
    const tickets = await prisma.ticket.findMany({
      where: { eventId }
    });

    if (tickets.length === 0) {
      return [];
    }

    // Fetch all badges and badge types
    const badgeIds = tickets.map(t => t.badgeId);
    const [badges, badgeTypes] = await Promise.all([
      prisma.badge.findMany({
        where: { id: { in: badgeIds } }
      }),
      prisma.badgeType.findMany()
    ]);

    // Create maps
    const badgeTypeMap = new Map(badgeTypes.map(bt => [bt.id, bt]));
    const badgeMap = new Map(
      badges.map(b => [b.id, { ...b, badgeType: badgeTypeMap.get(b.badgeTypeId) || null }])
    );

    // Join tickets with badges
    return tickets.map(ticket => ({
      ...ticket,
      badge: badgeMap.get(ticket.badgeId) || null
    }));
  }
}
