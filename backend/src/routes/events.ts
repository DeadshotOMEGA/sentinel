import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eventRepository } from '../db/repositories/event-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { eventService } from '../services/event-service';
import { attendeeImportService } from '../services/attendee-import-service';
import { prisma } from '../db/prisma';
import { requireAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { broadcastEventCheckin, broadcastEventPresenceUpdate } from '../websocket';
import { audit } from '../middleware/audit';
import type { EventStatus, AttendeeImportColumnMapping, DuplicateResolution, AttendeeImportRow } from '../../../shared/types';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  description: z.string().nullish(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  autoExpireBadges: z.boolean().default(true),
});

const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().nullish(),
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

// GET /api/events/:id - Get event details with attendees
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
      attendees,
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
  audit('event_create', 'event'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = createEventSchema.safeParse(req.body);
      if (!validationResult.success) {
        const zodErrors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(
          'Invalid event data',
          zodErrors,
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
  audit('event_update', 'event'),
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
  audit('event_delete', 'event'),
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

// GET /api/events/:id/monitor - Monitor view with filtering
router.get('/:id/monitor', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;

    const event = await eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${id} not found`,
        'Please check the event ID and try again.'
      );
    }

    let attendees = await eventRepository.findByEventId(id);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      attendees = attendees.filter((a) =>
        a.name.toLowerCase().includes(searchLower) ||
        a.organization.toLowerCase().includes(searchLower) ||
        (a.rank && a.rank.toLowerCase().includes(searchLower))
      );
    }

    // Apply role filter
    if (role) {
      attendees = attendees.filter((a) => a.role === role);
    }

    res.json({
      event,
      attendees,
    });
  } catch (err) {
    next(err);
  }
});

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

      // Track if badge is a member's permanent badge (don't reassign it)
      let isMemberBadge = false;

      // If badgeId provided, verify badge exists and check availability
      if (data.badgeId) {
        const badge = await badgeRepository.findById(data.badgeId);
        if (!badge) {
          throw new NotFoundError(
            'Badge not found',
            `Badge ${data.badgeId} not found`,
            'Please check the badge ID and try again.'
          );
        }

        // Allow unassigned badges and member-assigned badges
        // Reject badges already assigned to events (in use elsewhere)
        if (badge.assignmentType === 'event') {
          throw new ConflictError(
            'Badge already assigned to an event',
            `Badge ${data.badgeId} is already assigned to an event`,
            'This badge is in use for another event. Please select a different badge.'
          );
        }

        // If badge belongs to a member, we'll link it but not reassign
        if (badge.assignmentType === 'member') {
          isMemberBadge = true;
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
        status: data.status ?? 'pending',
      });

      // Only assign badge to event if it was unassigned (temporary badge)
      // Member badges stay assigned to the member
      if (data.badgeId && !isMemberBadge) {
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

// DELETE /api/events/:id/attendees - Bulk remove attendees
router.delete(
  '/:id/attendees',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const bulkDeleteSchema = z.object({
        attendeeIds: z.array(z.string().uuid()).min(1),
      });

      const validationResult = bulkDeleteSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid request data',
          validationResult.error.message,
          'Please provide valid attendee IDs.'
        );
      }

      const { attendeeIds } = validationResult.data;

      // Verify event exists
      const event = await eventRepository.findById(id);
      if (!event) {
        throw new NotFoundError(
          'Event not found',
          `Event ${id} not found`,
          'Please check the event ID and try again.'
        );
      }

      // Remove each attendee
      for (const attendeeId of attendeeIds) {
        const attendee = await eventRepository.findAttendeeById(attendeeId);
        if (attendee && attendee.eventId === id) {
          // Release badge if assigned, but only if it's not a member's permanent badge
          if (attendee.badgeId) {
            const badge = await badgeRepository.findById(attendee.badgeId);
            // Only unassign if badge was assigned to the event (temporary badge)
            // Don't unassign member badges - they belong to the member permanently
            if (badge && badge.assignmentType === 'event') {
              await badgeRepository.unassign(attendee.badgeId);
            }
          }
          await eventRepository.removeAttendee(attendeeId);
        }
      }

      res.status(204).send();
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

      // Release badge if assigned, but only if it's not a member's permanent badge
      if (attendee.badgeId) {
        const badge = await badgeRepository.findById(attendee.badgeId);
        // Only unassign if badge was assigned to the event (temporary badge)
        // Don't unassign member badges - they belong to the member permanently
        if (badge && badge.assignmentType === 'event') {
          await badgeRepository.unassign(attendee.badgeId);
        }
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

// GET /api/events/:id/presence-stats - Real-time presence stats
router.get('/:id/presence-stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const stats = await eventService.getEventPresenceStats(id);

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id/presence - Alias for presence-stats
router.get('/:id/presence', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const stats = await eventService.getEventPresenceStats(id);

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id/roles - Get event-specific roles or default roles
router.get('/:id/roles', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

    // If event has custom roles, return them
    if (event.customRoles) {
      return res.json({ roles: event.customRoles, isCustom: true });
    }

    // Otherwise, fetch default roles from settings
    const setting = await prisma.report_settings.findUnique({
      where: { key: 'event_roles' },
    });

    const roles = setting?.value as string[] || ['Participant', 'Instructor', 'Staff', 'Volunteer'];

    res.json({ roles, isCustom: false });
  } catch (err) {
    next(err);
  }
});

// PUT /api/events/:id/roles - Update event-specific roles
router.put('/:id/roles', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const rolesSchema = z.object({
      roles: z.array(z.string().min(1).max(100)).min(1).max(20).nullable(),
    });

    const validationResult = rolesSchema.safeParse(req.body);
    if (!validationResult.success) {
      const zodErrors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(
        'Invalid roles data',
        zodErrors,
        'Please check all required fields and try again.'
      );
    }

    const { roles } = validationResult.data;

    // null means reset to default roles
    const event = await eventRepository.update(id, {
      customRoles: roles as any,
    });

    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ATTENDEE IMPORT ENDPOINTS
// ============================================================================

// Validation schemas for import
const importSheetsSchema = z.object({
  fileBase64: z.string().min(1),
});

const importHeadersSchema = z.object({
  csv: z.string().min(1),
});

const importRolesSchema = z.object({
  csv: z.string().min(1),
  columnMapping: z.record(z.string().nullable()),
});

const importPreviewSchema = z.object({
  csv: z.string().min(1),
  columnMapping: z.record(z.string().nullable()),
  roleMapping: z.record(z.string()),
});

const importExecuteSchema = z.object({
  csv: z.string().min(1),
  columnMapping: z.record(z.string().nullable()),
  roleMapping: z.record(z.string()),
  duplicateResolutions: z.record(z.enum(['skip', 'add', 'update', 'edit'])),
  editedValues: z.record(z.object({
    name: z.string(),
    rank: z.string().optional(),
    organization: z.string(),
    role: z.string(),
    accessStart: z.string().optional(),
    accessEnd: z.string().optional(),
  })).optional(),
});

// POST /api/events/:id/attendees/import/sheets - Parse Excel file, return sheet list
router.post(
  '/:id/attendees/import/sheets',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
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

      const validationResult = importSheetsSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid request data',
          validationResult.error.message,
          'Please provide a valid Excel file.'
        );
      }

      const { fileBase64 } = validationResult.data;

      // Decode base64 to buffer
      const buffer = Buffer.from(fileBase64, 'base64');

      const sheets = attendeeImportService.parseExcelSheets(buffer);

      res.json({ sheets });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/events/:id/attendees/import/headers - Parse CSV headers, suggest mapping
router.post(
  '/:id/attendees/import/headers',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
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

      const validationResult = importHeadersSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid request data',
          validationResult.error.message,
          'Please provide valid CSV data.'
        );
      }

      const { csv } = validationResult.data;

      const result = attendeeImportService.parseHeaders(csv);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/events/:id/attendees/import/roles - Detect roles from CSV
router.post(
  '/:id/attendees/import/roles',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = importRolesSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid request data',
          validationResult.error.message,
          'Please provide valid CSV data and column mapping.'
        );
      }

      const { csv, columnMapping } = validationResult.data;

      const result = await attendeeImportService.detectRoles(
        csv,
        columnMapping as AttendeeImportColumnMapping,
        id
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/events/:id/attendees/import/preview - Generate preview with duplicates
router.post(
  '/:id/attendees/import/preview',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = importPreviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid request data',
          validationResult.error.message,
          'Please provide valid CSV data, column mapping, and role mapping.'
        );
      }

      const { csv, columnMapping, roleMapping } = validationResult.data;

      const preview = await attendeeImportService.generatePreview(
        csv,
        columnMapping as AttendeeImportColumnMapping,
        roleMapping,
        id
      );

      res.json({ preview });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/events/:id/attendees/import/execute - Execute import with resolutions
router.post(
  '/:id/attendees/import/execute',
  requireAuth,
  requireRole('admin'),
  audit('attendee_import', 'event'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const validationResult = importExecuteSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid request data',
          validationResult.error.message,
          'Please provide valid import data.'
        );
      }

      const { csv, columnMapping, roleMapping, duplicateResolutions, editedValues } = validationResult.data;

      const result = await attendeeImportService.executeImport(
        csv,
        columnMapping as AttendeeImportColumnMapping,
        roleMapping,
        duplicateResolutions as Record<number, DuplicateResolution>,
        (editedValues || {}) as Record<number, AttendeeImportRow>,
        id
      );

      res.json({ result });
    } catch (err) {
      next(err);
    }
  }
);

export { router as eventRoutes };
