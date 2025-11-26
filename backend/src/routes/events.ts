import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eventRepository } from '../db/repositories/event-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { eventService } from '../services/event-service';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { broadcastEventCheckin, broadcastEventPresenceUpdate } from '../websocket';
import type { EventStatus } from '../../../shared/types';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  autoExpireBadges: z.boolean().optional(),
});

const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  autoExpireBadges: z.boolean().optional(),
});

const createAttendeeSchema = z.object({
  name: z.string().min(1).max(200),
  rank: z.string().optional(),
  organization: z.string().min(1).max(200),
  role: z.string().min(1).max(100),
  badgeId: z.string().uuid().optional(),
  badgeAssignedAt: z.string().datetime().optional(),
  accessStart: z.string().date().optional(),
  accessEnd: z.string().date().optional(),
  status: z.enum(['pending', 'active', 'checked_out', 'expired']).optional(),
});

const updateAttendeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  rank: z.string().optional(),
  organization: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(100).optional(),
  badgeId: z.string().uuid().optional(),
  badgeAssignedAt: z.string().datetime().optional(),
  accessStart: z.string().date().optional(),
  accessEnd: z.string().date().optional(),
  status: z.enum(['pending', 'active', 'checked_out', 'expired']).optional(),
});

const assignBadgeSchema = z.object({
  badgeId: z.string().uuid(),
});

// ============================================================================
// EVENT ENDPOINTS
// ============================================================================

// GET /api/events - List all events
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusFilter = req.query.status as EventStatus | undefined;

    let events = await eventRepository.findAll();

    // Filter by status if provided
    if (statusFilter) {
      events = events.filter((e) => e.status === statusFilter);
    }

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/stats - Get event statistics
router.get('/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await eventRepository.findAll();

    const stats = {
      total: events.length,
      active: events.filter(e => e.status === 'active').length,
      draft: events.filter(e => e.status === 'draft').length,
      completed: events.filter(e => e.status === 'completed').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
    };

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id - Get event details with attendee count
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${id} not found`,
        'Please check the event ID and try again.'
      );
    }

    const attendees = await eventRepository.findByEventId(id);

    res.json({
      event,
      attendeeCount: attendees.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/events - Create new event
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = createEventSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid event data',
          validationResult.error.message,
          'Please check all required fields and try again.'
        );
      }

      const data = validationResult.data;

      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      eventService.validateEventDates(startDate, endDate);

      // Check if code already exists
      const existing = await eventRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError(
          'Event code already exists',
          `Event code ${data.code} already exists`,
          'Event codes must be unique. Please use a different code.'
        );
      }

      const event = await eventRepository.create({
        ...data,
        startDate,
        endDate,
        createdBy: req.user?.id,
      });

      res.status(201).json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/events/:id - Update event
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = updateEventSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid event data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      // Check if event exists
      const existing = await eventRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Event not found',
          `Event ${id} not found`,
          'Please check the event ID and try again.'
        );
      }

      const data = validationResult.data;

      // Validate dates if provided
      if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
        eventService.validateEventDates(startDate, endDate);
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const conflict = await eventRepository.findByCode(data.code);
        if (conflict) {
          throw new ConflictError(
            'Event code already exists',
            `Event code ${data.code} already exists`,
            'Event codes must be unique. Please use a different code.'
          );
        }
      }

      const updatedData: Record<string, unknown> = { ...data };
      if (data.startDate) updatedData.startDate = new Date(data.startDate);
      if (data.endDate) updatedData.endDate = new Date(data.endDate);

      const event = await eventRepository.update(id, updatedData);

      res.json({ event });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/events/:id - Cancel/delete event
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if event exists
      const existing = await eventRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(
          'Event not found',
          `Event ${id} not found`,
          'Please check the event ID and try again.'
        );
      }

      await eventRepository.delete(id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// EVENT ATTENDEE ENDPOINTS
// ============================================================================

// GET /api/events/:id/attendees - List event attendees
router.get('/:id/attendees', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verify event exists
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${id} not found`,
        'Please check the event ID and try again.'
      );
    }

    const attendees = await eventRepository.findByEventId(id);

    res.json({ attendees });
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:id/attendees - Add attendee manually
router.post(
  '/:id/attendees',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = createAttendeeSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid attendee data',
          validationResult.error.message,
          'Please check all required fields and try again.'
        );
      }

      // Verify event exists
      const event = await eventRepository.findById(id);
      if (!event) {
        throw new NotFoundError(
          'Event not found',
          `Event ${id} not found`,
          'Please check the event ID and try again.'
        );
      }

      const data = validationResult.data;

      // If badgeId provided, verify badge exists and is available
      if (data.badgeId) {
        const badge = await badgeRepository.findById(data.badgeId);
        if (!badge) {
          throw new NotFoundError(
            'Badge not found',
            `Badge ${data.badgeId} not found`,
            'Please check the badge ID and try again.'
          );
        }

        if (badge.assignmentType !== 'unassigned') {
          throw new ConflictError(
            'Badge already assigned',
            `Badge ${data.badgeId} is already assigned`,
            'This badge is already assigned. Please select a different badge.'
          );
        }
      }

      const attendee = await eventRepository.addAttendee({
        eventId: id,
        name: data.name,
        rank: data.rank,
        organization: data.organization,
        role: data.role,
        badgeId: data.badgeId,
        badgeAssignedAt: data.badgeAssignedAt ? new Date(data.badgeAssignedAt) : undefined,
        accessStart: data.accessStart ? new Date(data.accessStart) : undefined,
        accessEnd: data.accessEnd ? new Date(data.accessEnd) : undefined,
        status: data.status,
      });

      // If badge assigned, update badge assignment
      if (data.badgeId) {
        await badgeRepository.assign(data.badgeId, id, 'event');
      }

      res.status(201).json({ attendee });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/events/:id/attendees/:attendeeId - Update attendee
router.put(
  '/:id/attendees/:attendeeId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, attendeeId } = req.params;

      const validationResult = updateAttendeeSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid attendee data',
          validationResult.error.message,
          'Please check all fields and try again.'
        );
      }

      // Verify event exists
      const event = await eventRepository.findById(id);
      if (!event) {
        throw new NotFoundError(
          'Event not found',
          `Event ${id} not found`,
          'Please check the event ID and try again.'
        );
      }

      // Verify attendee exists and belongs to this event
      const attendee = await eventRepository.findAttendeeById(attendeeId);
      if (!attendee || attendee.eventId !== id) {
        throw new NotFoundError(
          'Attendee not found',
          `Attendee ${attendeeId} does not belong to event ${id}`,
          'Please check the attendee ID and try again.'
        );
      }

      const data = validationResult.data;

      // If badgeId is being changed, validate the new badge
      if (data.badgeId && data.badgeId !== attendee.badgeId) {
        const badge = await badgeRepository.findById(data.badgeId);
        if (!badge) {
          throw new NotFoundError(
            'Badge not found',
            `Badge ${data.badgeId} not found`,
            'Please check the badge ID and try again.'
          );
        }

        if (badge.assignmentType !== 'unassigned') {
          throw new ConflictError(
            'Badge already assigned',
            `Badge ${data.badgeId} is already assigned`,
            'This badge is already assigned. Please select a different badge.'
          );
        }

        // Release old badge if it exists
        if (attendee.badgeId) {
          await badgeRepository.unassign(attendee.badgeId);
        }

        // Assign new badge
        await badgeRepository.assign(data.badgeId, id, 'event');
      }

      const updatedData: Record<string, unknown> = { ...data };
      if (data.badgeAssignedAt) updatedData.badgeAssignedAt = new Date(data.badgeAssignedAt);
      if (data.accessStart) updatedData.accessStart = new Date(data.accessStart);
      if (data.accessEnd) updatedData.accessEnd = new Date(data.accessEnd);

      const updatedAttendee = await eventRepository.updateAttendee(attendeeId, updatedData);

      res.json({ attendee: updatedAttendee });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/events/:id/attendees/:attendeeId - Remove attendee
router.delete(
  '/:id/attendees/:attendeeId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, attendeeId } = req.params;

      // Verify event exists
      const event = await eventRepository.findById(id);
      if (!event) {
        throw new NotFoundError(
          'Event not found',
          `Event ${id} not found`,
          'Please check the event ID and try again.'
        );
      }

      // Verify attendee exists and belongs to this event
      const attendee = await eventRepository.findAttendeeById(attendeeId);
      if (!attendee || attendee.eventId !== id) {
        throw new NotFoundError(
          'Attendee not found',
          `Attendee ${attendeeId} does not belong to event ${id}`,
          'Please check the attendee ID and try again.'
        );
      }

      // Release badge if assigned
      if (attendee.badgeId) {
        await badgeRepository.unassign(attendee.badgeId);
      }

      await eventRepository.removeAttendee(attendeeId);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/events/:id/attendees/:attendeeId/assign-badge - Assign badge to attendee
router.put(
  '/:id/attendees/:attendeeId/assign-badge',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, attendeeId } = req.params;

      const validationResult = assignBadgeSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid badge data',
          validationResult.error.message,
          'Please provide a valid badge ID.'
        );
      }

      const { badgeId } = validationResult.data;

      const attendee = await eventService.assignBadgeToAttendee(id, attendeeId, badgeId);

      res.json({ attendee });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/events/:id/attendees/:attendeeId/unassign-badge - Unassign badge
router.put(
  '/:id/attendees/:attendeeId/unassign-badge',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, attendeeId } = req.params;

      const attendee = await eventService.unassignBadgeFromAttendee(id, attendeeId);

      res.json({ attendee });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/events/:id/close - End event, expire all badges
router.post(
  '/:id/close',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await eventService.closeEvent(id);

      // Broadcast event close to connected clients
      const stats = await eventRepository.getEventPresenceStats(id);
      broadcastEventPresenceUpdate(id, {
        totalAttendees: stats.totalAttendees,
        activeAttendees: stats.activeAttendees,
        checkedOut: stats.checkedOut,
        expired: stats.expired,
      });

      res.json({
        event: result.event,
        expiredBadges: result.expiredCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/events/:id/presence - Real-time presence stats
router.get('/:id/presence', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const stats = await eventService.getEventPresenceStats(id);

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export { router as eventRoutes };
