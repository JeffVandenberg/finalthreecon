import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class EventService {
  async getAllEvents(filters?: {
    eventTypeId?: string;
    roomId?: string;
    spaceId?: string;
    daypartId?: string;
  }) {
    // Fetch events without includes
    const events = await prisma.event.findMany({
      where: {
        ...(filters?.eventTypeId && { eventTypeId: filters.eventTypeId }),
        ...(filters?.roomId && { roomId: filters.roomId }),
        ...(filters?.spaceId && { spaceId: filters.spaceId }),
        ...(filters?.daypartId && { startDaypartId: filters.daypartId })
      }
    });

    // Fetch all related data
    const [eventTypes, rooms, spaces, dayparts, tickets] = await Promise.all([
      prisma.eventType.findMany({ select: { id: true, name: true } }),
      prisma.room.findMany({ select: { id: true, name: true } }),
      prisma.space.findMany({ select: { id: true, name: true } }),
      prisma.daypart.findMany({ select: { id: true, name: true, startDate: true, dayName: true } }),
      prisma.ticket.findMany({ select: { id: true, eventId: true } })
    ]);

    // Create lookup maps
    const eventTypeMap = new Map(eventTypes.map(et => [et.id, et]));
    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const spaceMap = new Map(spaces.map(s => [s.id, s]));
    const daypartMap = new Map(dayparts.map(d => [d.id, d]));

    // Group tickets by eventId
    const ticketsByEvent = new Map<string, typeof tickets>();
    tickets.forEach(ticket => {
      if (!ticketsByEvent.has(ticket.eventId)) {
        ticketsByEvent.set(ticket.eventId, []);
      }
      ticketsByEvent.get(ticket.eventId)!.push(ticket);
    });

    // Manually join
    const eventsWithRelations = events.map(event => ({
      ...event,
      eventType: eventTypeMap.get(event.eventTypeId) || null,
      room: roomMap.get(event.roomId) || null,
      space: spaceMap.get(event.spaceId) || null,
      startDaypart: event.startDaypartId ? daypartMap.get(event.startDaypartId) || null : null,
      tickets: ticketsByEvent.get(event.id) || []
    }));

    // Sort by startDate and room name
    return eventsWithRelations.sort((a, b) => {
      const dateCompare = (a.startDaypart?.startDate?.getTime() || 0) -
                          (b.startDaypart?.startDate?.getTime() || 0);
      if (dateCompare !== 0) return dateCompare;
      return (a.room?.name || '').localeCompare(b.room?.name || '');
    });
  }

  async getEventById(id: string) {
    // Note: Using findFirst because events now have composite key (id, spaceId)
    const event = await prisma.event.findFirst({
      where: { id }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Fetch related data
    const [eventType, room, space, daypart, tickets, badges, badgeTypes] = await Promise.all([
      event.eventTypeId ? prisma.eventType.findUnique({ where: { id: event.eventTypeId } }) : null,
      prisma.room.findUnique({ where: { id: event.roomId } }),
      prisma.space.findUnique({ where: { id: event.spaceId } }),
      event.startDaypartId ? prisma.daypart.findUnique({ where: { id: event.startDaypartId } }) : null,
      prisma.ticket.findMany({ where: { eventId: id } }),
      prisma.badge.findMany(),
      prisma.badgeType.findMany()
    ]);

    // Create badge and badgeType maps
    const badgeTypeMap = new Map(badgeTypes.map(bt => [bt.id, bt]));
    const badgeMap = new Map(badges.map(b => [b.id, { ...b, badgeType: badgeTypeMap.get(b.badgeTypeId) || null }]));

    // Join tickets with badges
    const ticketsWithBadges = tickets.map(ticket => ({
      ...ticket,
      badge: badgeMap.get(ticket.badgeId) || null
    }));

    return {
      ...event,
      eventType,
      room,
      space,
      startDaypart: daypart,
      tickets: ticketsWithBadges
    };
  }

  async createEvent(data: any) {
    // Just create and return the event - frontend can fetch relations if needed
    return await prisma.event.create({
      data
    });
  }

  async updateEvent(id: string, data: any) {
    // Note: Using findFirst + update because events now have composite key (id, spaceId)
    const event = await prisma.event.findFirst({
      where: { id }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return await prisma.event.update({
      where: {
        id_spaceId: {
          id: event.id,
          spaceId: event.spaceId
        }
      },
      data
    });
  }

  async deleteEvent(id: string) {
    // Note: Using findFirst + delete because events now have composite key (id, spaceId)
    const event = await prisma.event.findFirst({
      where: { id }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return await prisma.event.delete({
      where: {
        id_spaceId: {
          id: event.id,
          spaceId: event.spaceId
        }
      }
    });
  }

  async getEventGrid() {
    // Fetch base data - rooms still have working relations for spaces and roomEventTypes
    const [rooms, dayparts, events, eventTypes] = await Promise.all([
      prisma.room.findMany({
        include: {
          spaces: true,
          roomEventTypes: {
            include: {
              eventType: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.daypart.findMany({
        orderBy: { startDate: 'asc' }
      }),
      prisma.event.findMany(), // No includes - relations removed
      prisma.eventType.findMany({ select: { id: true, name: true } })
    ]);

    // Create lookup maps for manual joining
    const eventTypeMap = new Map(eventTypes.map(et => [et.id, et]));
    const roomMap = new Map(rooms.map(r => [r.id, { id: r.id, name: r.name }]));

    // Build space map from rooms' spaces
    const spaceMap = new Map();
    rooms.forEach(room => {
      room.spaces.forEach(space => {
        spaceMap.set(space.id, { id: space.id, name: space.name, roomId: space.roomId });
      });
    });

    const daypartMap = new Map(dayparts.map(d => [d.id, d]));

    // Manually join event relations
    const eventsWithRelations = events.map(event => ({
      ...event,
      eventType: eventTypeMap.get(event.eventTypeId) || null,
      room: roomMap.get(event.roomId) || null,
      space: spaceMap.get(event.spaceId) || null,
      startDaypart: event.startDaypartId ? daypartMap.get(event.startDaypartId) || null : null
    }));

    return {
      rooms,
      dayparts,
      events: eventsWithRelations
    };
  }

  async getEventAttendees(eventId: string) {
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
