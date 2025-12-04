import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { visitorRepository } from '../db/repositories/visitor-repository';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { requireAuth, requireDisplayAuth } from '../auth';
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
  visitType: z.enum(['contractor', 'recruitment', 'event', 'official', 'museum', 'other']),
  hostMemberId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  purpose: z.string().optional(),
  checkInTime: z.string().datetime().optional(),
  badgeId: z.string().uuid().optional(),
  kioskId: z.string().min(1, 'Kiosk ID is required'),
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
