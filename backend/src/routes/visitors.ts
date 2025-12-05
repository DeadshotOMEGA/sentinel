import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { visitorRepository } from '../db/repositories/visitor-repository';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { requireAuth, requireDisplayAuth, requireRole } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { getKioskName } from '../utils/kiosk-names';
import type { VisitType } from '../../../shared/types';
import { broadcastVisitorSignin, broadcastVisitorSignout, broadcastPresenceUpdate } from '../websocket';
import { prisma } from '../db/prisma';

const router = Router();

// Validation schemas
const createVisitorSchema = z.object({
  name: z.string().min(1).max(255),
  organization: z.string().min(1).max(255),
  visitType: z.enum(['general', 'contractor', 'recruitment', 'course', 'event', 'official', 'other']),
  hostMemberId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  purpose: z.string().optional(),
  checkInTime: z.string().datetime().optional(),
  badgeId: z.string().uuid().optional(),
  kioskId: z.string().min(1, 'Kiosk ID is required'),
});

const updateVisitorSchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  hostMemberId: z.string().uuid().optional().nullable(),
  purpose: z.string().optional(),
});

const manualVisitorCheckinSchema = z.object({
  name: z.string().min(1).max(255),
  organization: z.string().min(1).max(255),
  visitType: z.enum(['general', 'contractor', 'recruitment', 'course', 'event', 'official', 'other']),
  hostMemberId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  purpose: z.string().optional(),
  adminNotes: z.string().optional(),
});

// GET /api/visitors - List visitors with filters
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitType = req.query.visitType as VisitType | undefined;
    const hostMemberId = req.query.hostMemberId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const visitors = await visitorRepository.findAll({
      visitType,
      hostMemberId,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
    });

    res.json({ visitors });
  } catch (err) {
    next(err);
  }
});

// GET /api/visitors/active - Currently signed-in visitors (requires display/kiosk/admin auth)
router.get('/active', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitors = await visitorRepository.findActive();
    res.json({ visitors });
  } catch (err) {
    next(err);
  }
});

// GET /api/visitors/history - Visitor history with pagination and filters
router.get('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const visitType = req.query.visitType as string | undefined;
    const organization = req.query.organization as string | undefined;

    if (page < 1) {
      throw new ValidationError(
        'Invalid page number',
        'Page must be >= 1',
        'Please provide a valid page number.'
      );
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError(
        'Invalid limit',
        'Limit must be between 1 and 100',
        'Please provide a valid limit.'
      );
    }

    const result = await visitorRepository.findHistory(
      {
        startDate,
        endDate,
        visitType,
        organization,
      },
      {
        page,
        limit,
      }
    );

    res.json({
      visitors: result.visitors,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/visitors/manual - Manual visitor check-in by admin
router.post('/manual', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = manualVisitorCheckinSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_MANUAL_VISITOR_CHECKIN_DATA',
        validationResult.error.message,
        'Invalid manual visitor check-in data. Please check all required fields.'
      );
    }

    const data = validationResult.data;

    if (!req.user) {
      throw new ValidationError(
        'UNAUTHORIZED',
        'User not authenticated',
        'You must be logged in to perform this action.'
      );
    }

    // Validate eventId exists if provided
    if (data.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
      });
      if (!event) {
        throw new ValidationError(
          'INVALID_EVENT',
          `Event ${data.eventId} not found`,
          'Please select a valid event.'
        );
      }
    }

    // Validate hostMemberId exists if provided
    if (data.hostMemberId) {
      const member = await memberRepository.findById(data.hostMemberId);
      if (!member) {
        throw new ValidationError(
          'INVALID_HOST_MEMBER',
          `Member ${data.hostMemberId} not found`,
          'Please select a valid member as host.'
        );
      }
    }

    // Create visitor with manual check-in
    const visitor = await visitorRepository.create({
      name: data.name,
      organization: data.organization,
      visitType: data.visitType,
      hostMemberId: data.hostMemberId,
      eventId: data.eventId,
      purpose: data.purpose,
      adminNotes: data.adminNotes,
      checkInTime: new Date(),
      checkInMethod: 'admin_manual',
      createdByAdmin: req.user.id,
    });

    // Fetch related data for broadcast
    const visitorWithRelations = await prisma.visitor.findUnique({
      where: { id: visitor.id },
      include: {
        hostMember: { select: { firstName: true, lastName: true, rank: true } },
        event: { select: { name: true } },
      },
    });

    if (!visitorWithRelations) {
      throw new Error(`Visitor ${visitor.id} not found after creation`);
    }

    // Broadcast visitor signin event
    broadcastVisitorSignin({
      visitorId: visitor.id,
      name: visitor.name,
      organization: visitor.organization,
      visitType: visitor.visitType,
      visitReason: visitor.purpose ?? null,
      hostName: visitorWithRelations.hostMember
        ? `${visitorWithRelations.hostMember.rank} ${visitorWithRelations.hostMember.firstName} ${visitorWithRelations.hostMember.lastName}`
        : null,
      eventId: visitor.eventId ?? null,
      eventName: visitorWithRelations.event?.name ?? null,
      kioskId: 'admin-dashboard',
      kioskName: 'Admin Dashboard',
      checkInTime: visitor.checkInTime.toISOString(),
    });

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    res.status(201).json({ visitor });
  } catch (err) {
    next(err);
  }
});

// POST /api/visitors - Record visitor sign-in (public for kiosk self-service)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createVisitorSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid visitor data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    const visitor = await visitorRepository.create({
      name: data.name,
      organization: data.organization,
      visitType: data.visitType,
      hostMemberId: data.hostMemberId,
      eventId: data.eventId,
      purpose: data.purpose,
      checkInTime: data.checkInTime ? new Date(data.checkInTime) : undefined,
      badgeId: data.badgeId,
    });

    // Fetch related data for broadcast
    const visitorWithRelations = await prisma.visitor.findUnique({
      where: { id: visitor.id },
      include: {
        hostMember: { select: { firstName: true, lastName: true, rank: true } },
        event: { select: { name: true } },
      },
    });

    if (!visitorWithRelations) {
      throw new Error(`Visitor ${visitor.id} not found after creation`);
    }

    // Broadcast visitor signin event
    broadcastVisitorSignin({
      visitorId: visitor.id,
      name: visitor.name,
      organization: visitor.organization,
      visitType: visitor.visitType,
      visitReason: visitor.purpose ?? null,
      hostName: visitorWithRelations.hostMember
        ? `${visitorWithRelations.hostMember.rank} ${visitorWithRelations.hostMember.firstName} ${visitorWithRelations.hostMember.lastName}`
        : null,
      eventId: visitor.eventId ?? null,
      eventName: visitorWithRelations.event?.name ?? null,
      kioskId: data.kioskId,
      kioskName: getKioskName(data.kioskId),
      checkInTime: visitor.checkInTime.toISOString(),
    });

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    res.status(201).json({ visitor });
  } catch (err) {
    next(err);
  }
});

// PUT /api/visitors/:id - Update visitor details
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate input
    const validationResult = updateVisitorSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid visitor update data',
        validationResult.error.message,
        'Please check all required fields and try again.'
      );
    }

    const data = validationResult.data;

    // Check if visitor exists
    const existing = await visitorRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Visitor not found',
        `Visitor ${id} not found`,
        'Please check the visitor ID and try again.'
      );
    }

    // Check if already checked out
    if (existing.checkOutTime) {
      throw new ValidationError(
        'Cannot update checked-out visitor',
        `Visitor ${id} is already checked out`,
        'Only active visitors can be updated.'
      );
    }

    // Validate eventId exists if provided
    if (data.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
      });
      if (!event) {
        throw new ValidationError(
          'Invalid event',
          `Event ${data.eventId} not found`,
          'Please select a valid event.'
        );
      }
    }

    // Validate hostMemberId exists if provided
    if (data.hostMemberId) {
      const member = await memberRepository.findById(data.hostMemberId);
      if (!member) {
        throw new ValidationError(
          'Invalid host member',
          `Member ${data.hostMemberId} not found`,
          'Please select a valid member as host.'
        );
      }
    }

    // Update visitor
    const visitor = await visitorRepository.update(id, {
      eventId: data.eventId,
      hostMemberId: data.hostMemberId,
      purpose: data.purpose,
    });

    res.json({ visitor });
  } catch (err) {
    next(err);
  }
});

// PUT /api/visitors/:id/checkout - Sign out visitor
router.put('/:id/checkout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if visitor exists
    const existing = await visitorRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(
        'Visitor not found',
        `Visitor ${id} not found`,
        'Please check the visitor ID and try again.'
      );
    }

    // Check if already checked out
    if (existing.checkOutTime) {
      throw new ConflictError(
        'Visitor already checked out',
        `Visitor ${id} is already checked out`,
        'This visitor has already been checked out.'
      );
    }

    const visitor = await visitorRepository.checkout(id);

    // Broadcast visitor signout event
    if (!visitor.checkOutTime) {
      throw new Error('Checkout time was not set');
    }

    broadcastVisitorSignout({
      visitorId: visitor.id,
      checkOutTime: visitor.checkOutTime.toISOString(),
    });

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    res.json({ visitor });
  } catch (err) {
    next(err);
  }
});

export { router as visitorRoutes };
