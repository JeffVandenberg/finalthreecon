import { Router } from 'express';
import { EventService } from '../services/event.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const eventService = new EventService();

// Get all events
router.get('/', async (req, res, next) => {
  try {
    const { eventTypeId, roomId, spaceId, daypartId } = req.query;
    const events = await eventService.getAllEvents({
      eventTypeId: eventTypeId as string,
      roomId: roomId as string,
      spaceId: spaceId as string,
      daypartId: daypartId as string
    });
    res.json({ data: events });
  } catch (error) {
    next(error);
  }
});

// Get event grid (for schedule view)
router.get('/grid', async (req, res, next) => {
  try {
    const grid = await eventService.getEventGrid();
    res.json({ data: grid });
  } catch (error) {
    next(error);
  }
});

// Get event by ID
router.get('/:id', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    res.json({ data: event });
  } catch (error) {
    next(error);
  }
});

// Get event attendees
router.get('/:id/attendees', authenticate, async (req, res, next) => {
  try {
    const attendees = await eventService.getEventAttendees(req.params.id as string);
    res.json({ data: attendees });
  } catch (error) {
    next(error);
  }
});

// Create event
router.post('/', authenticate, async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json({ data: event });
  } catch (error) {
    next(error);
  }
});

// Update event
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const event = await eventService.updateEvent(req.params.id as string, req.body);
    res.json({ data: event });
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await eventService.deleteEvent(req.params.id as string);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
