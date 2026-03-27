import { Router } from 'express';
import { TicketService } from '../services/ticket.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const ticketService = new TicketService();

// Create ticket (register for event)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json({ data: ticket, message: 'Registered for event successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete ticket (unregister from event)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await ticketService.deleteTicket(req.params.id as string);
    res.json({ message: 'Unregistered from event successfully' });
  } catch (error) {
    next(error);
  }
});

// Get tickets by badge
router.get('/badge/:badgeId', authenticate, async (req, res, next) => {
  try {
    const tickets = await ticketService.getTicketsByBadge(req.params.badgeId as string);
    res.json({ data: tickets });
  } catch (error) {
    next(error);
  }
});

// Get tickets by event
router.get('/event/:eventId', authenticate, async (req, res, next) => {
  try {
    const tickets = await ticketService.getTicketsByEvent(req.params.eventId as string);
    res.json({ data: tickets });
  } catch (error) {
    next(error);
  }
});

export default router;
