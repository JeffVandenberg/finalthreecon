import { TicketService } from '../../../src/services/ticket.service';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../src/middleware/errorHandler';

const mockPrisma = new PrismaClient() as any;

describe('TicketService', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    ticketService = new TicketService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a ticket successfully', async () => {
      const ticketData = {
        badgeId: 'badge-1',
        eventId: 'event-1',
        relationships: {},
      };

      const mockEvent = {
        id: 'event-1',
        customFields: { capacity: 10 },
        tickets: [],
      };

      const mockTicket = {
        id: 'ticket-1',
        ...ticketData,
        badge: { id: 'badge-1' },
        event: { id: 'event-1' },
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.ticket.findFirst.mockResolvedValue(null);
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);

      const result = await ticketService.createTicket(ticketData);

      expect(result).toEqual(mockTicket);
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        ticketService.createTicket({
          badgeId: 'badge-1',
          eventId: 'event-999',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error if event is full', async () => {
      const mockEvent = {
        id: 'event-1',
        customFields: { capacity: 2 },
        tickets: [{ id: '1' }, { id: '2' }],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      await expect(
        ticketService.createTicket({
          badgeId: 'badge-1',
          eventId: 'event-1',
        })
      ).rejects.toThrow('Event is full');
    });

    it('should throw error if badge already registered', async () => {
      const mockEvent = {
        id: 'event-1',
        customFields: { capacity: 10 },
        tickets: [],
      };

      const existingTicket = {
        id: 'ticket-1',
        badgeId: 'badge-1',
        eventId: 'event-1',
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.ticket.findFirst.mockResolvedValue(
        existingTicket
      );

      await expect(
        ticketService.createTicket({
          badgeId: 'badge-1',
          eventId: 'event-1',
        })
      ).rejects.toThrow('Badge already registered for this event');
    });

    it('should allow ticket creation when no capacity is set', async () => {
      const mockEvent = {
        id: 'event-1',
        customFields: {},
        tickets: [],
      };

      const mockTicket = {
        id: 'ticket-1',
        badgeId: 'badge-1',
        eventId: 'event-1',
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.ticket.findFirst.mockResolvedValue(null);
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);

      const result = await ticketService.createTicket({
        badgeId: 'badge-1',
        eventId: 'event-1',
      });

      expect(result).toEqual(mockTicket);
    });
  });

  describe('deleteTicket', () => {
    it('should delete a ticket', async () => {
      const mockDeletedTicket = { id: 'ticket-1' };
      mockPrisma.ticket.delete.mockResolvedValue(
        mockDeletedTicket
      );

      const result = await ticketService.deleteTicket('ticket-1');

      expect(result).toEqual(mockDeletedTicket);
      expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
      });
    });
  });

  describe('getTicketsByBadge', () => {
    it('should return tickets for a badge', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          badgeId: 'badge-1',
          event: {
            id: 'event-1',
            name: 'Event 1',
            eventType: {},
            room: {},
            space: {},
            startDaypart: {},
          },
        },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await ticketService.getTicketsByBadge('badge-1');

      expect(result).toEqual(mockTickets);
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { badgeId: 'badge-1' },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe('getTicketsByEvent', () => {
    it('should return tickets for an event', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          eventId: 'event-1',
          badge: {
            id: 'badge-1',
            name: 'John Doe',
            badgeType: {},
          },
        },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await ticketService.getTicketsByEvent('event-1');

      expect(result).toEqual(mockTickets);
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
        include: expect.any(Object),
      });
    });
  });
});
