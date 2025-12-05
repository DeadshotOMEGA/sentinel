import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { checkinService } from '../services/checkin-service';
import { presenceService } from '../services/presence-service';
import { processBulkCheckins } from '../services/sync-service';
import { visitorRepository } from '../db/repositories/visitor-repository';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { requireAuth, requireDisplayAuth, requireRole } from '../auth';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';
import { kioskLimiter, bulkLimiter } from '../middleware/rate-limit';
import { broadcastVisitorSignout, broadcastPresenceUpdate } from '../websocket';

const router = Router();

// Validation schemas
const badgeScanSchema = z.object({
  serialNumber: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  kioskId: z.string().optional(),
});

const bulkCheckinSchema = z.object({
  checkins: z.array(z.object({
    serialNumber: z.string().min(1),
    timestamp: z.string().datetime(),
    kioskId: z.string().optional(),
    localTimestamp: z.number().optional(),
    sequenceNumber: z.number().optional(),
  })),
});

const bulkCheckoutSchema = z.object({
  memberIds: z.array(z.string().uuid()).default([]),
  visitorIds: z.array(z.string().uuid()).default([]),
});

const manualMemberCheckinSchema = z.object({
  memberId: z.string().uuid(),
});

// POST /api/checkins - Record badge scan (auto-detect in/out)
router.post('/', kioskLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = badgeScanSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_SCAN_DATA',
        validationResult.error.message,
        'Invalid badge scan data. Please check the badge serial number and try again.'
      );
    }

    const { serialNumber, timestamp, kioskId } = validationResult.data;

    // Delegate to service - handles all business logic
    const result = await checkinService.processCheckin(serialNumber, {
      timestamp: timestamp ? new Date(timestamp) : undefined,
      kioskId,
    });

    res.status(201).json({
      checkin: result.checkin,
      member: {
        id: result.member.id,
        firstName: result.member.firstName,
        lastName: result.member.lastName,
        rank: result.member.rank,
        serviceNumber: result.member.serviceNumber,
        division: result.member.division,
      },
      direction: result.direction,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkins/bulk - Sync offline queue (batch)
router.post('/bulk', bulkLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = bulkCheckinSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_BULK_DATA',
        validationResult.error.message,
        'Invalid bulk checkin data. Please check the data format and try again.'
      );
    }

    const { checkins: bulkCheckins } = validationResult.data;

    // Process bulk checkins with validation, deduplication, and error handling
    const result = await processBulkCheckins(bulkCheckins);

    res.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      results: result.results,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/presence - Current presence stats (requires display auth)
router.get('/presence', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await presenceService.getStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/presence/present - Currently present members (requires display auth)
router.get('/presence/present', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentMembers = await presenceService.getPresentMembers();
    res.json({ members: presentMembers });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/presence/list - All members with presence status
router.get('/presence/list', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presenceList = await presenceService.getMemberPresenceList();
    res.json({ presenceList });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/recent - Recent activity (checkins + visitors) - requires display auth
router.get('/recent', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const activity = await presenceService.getRecentActivity(limit);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/presence/all - All present people (members + visitors) - requires display auth
router.get('/presence/all', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentPeople = await presenceService.getAllPresentPeople();
    res.json({ presentPeople });
  } catch (err) {
    next(err);
  }
});

// PUT /api/checkins/members/:memberId/checkout - Admin force checkout member
router.put('/members/:memberId/checkout', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.params;

    // Validate memberId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) {
      throw new ValidationError(
        'INVALID_MEMBER_ID',
        `Invalid member ID format: ${memberId}`,
        'The member ID must be a valid UUID.'
      );
    }

    const result = await checkinService.adminCheckout(memberId);

    res.json({
      checkin: result.checkin,
      member: {
        id: result.member.id,
        firstName: result.member.firstName,
        lastName: result.member.lastName,
        rank: result.member.rank,
        serviceNumber: result.member.serviceNumber,
        division: result.member.division,
      },
      direction: result.direction,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkins/manual - Manual member check-in by admin
router.post('/manual', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = manualMemberCheckinSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_MANUAL_CHECKIN_DATA',
        validationResult.error.message,
        'Invalid manual check-in data. Please provide a valid member ID.'
      );
    }

    const { memberId } = validationResult.data;

    if (!req.user) {
      throw new ValidationError(
        'UNAUTHORIZED',
        'User not authenticated',
        'You must be logged in to perform this action.'
      );
    }

    // Find the member
    const { memberRepository } = await import('../db/repositories/member-repository');
    const member = await memberRepository.findById(memberId);

    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member you are trying to check in does not exist.'
      );
    }

    // Check if member already has an active check-in
    const existingCheckin = await checkinRepository.findLatestByMember(memberId);
    if (existingCheckin && existingCheckin.direction === 'in') {
      throw new ConflictError(
        'MEMBER_ALREADY_CHECKED_IN',
        `Member ${memberId} is already checked in`,
        'This member is already checked in. Please check them out first.'
      );
    }

    // Validate member has a badge ID
    if (!member.badgeId) {
      throw new ValidationError(
        'MEMBER_NO_BADGE',
        `Member ${memberId} has no badge assigned`,
        'This member does not have a badge assigned. Please assign a badge before checking in.'
      );
    }

    // Create a manual check-in (direction='in', method='admin_manual')
    const checkin = await checkinRepository.create({
      memberId,
      badgeId: member.badgeId,
      direction: 'in',
      timestamp: new Date(),
      synced: true,
      method: 'admin_manual',
      createdByAdmin: req.user.id,
    });

    // Broadcast checkin event
    const { broadcastCheckin, broadcastPresenceUpdate } = await import('../websocket');
    broadcastCheckin({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      rank: member.rank,
      division: member.division?.name,
      direction: 'in',
      timestamp: checkin.timestamp.toISOString(),
      kioskId: 'admin-dashboard',
      kioskName: 'Admin Dashboard',
    });

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    res.status(201).json({
      checkin,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        serviceNumber: member.serviceNumber,
        division: member.division?.name,
      },
      direction: 'in',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkins/bulk-checkout - Bulk checkout members and visitors
router.post('/bulk-checkout', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = bulkCheckoutSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_BULK_CHECKOUT_DATA',
        validationResult.error.message,
        'Invalid bulk checkout data. Please check the data format and try again.'
      );
    }

    const { memberIds, visitorIds } = validationResult.data;
    const results: Array<{ id: string; type: 'member' | 'visitor'; success: boolean; error?: string }> = [];

    // Process member checkouts
    for (const memberId of memberIds) {
      try {
        await checkinService.adminCheckout(memberId);
        results.push({ id: memberId, type: 'member', success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: memberId, type: 'member', success: false, error: errorMessage });
      }
    }

    // Process visitor checkouts
    for (const visitorId of visitorIds) {
      try {
        const existing = await visitorRepository.findById(visitorId);
        if (!existing) {
          throw new NotFoundError(
            'VISITOR_NOT_FOUND',
            `Visitor ${visitorId} not found`,
            'The visitor you are trying to check out does not exist.'
          );
        }

        if (existing.checkOutTime) {
          throw new ConflictError(
            'VISITOR_ALREADY_CHECKED_OUT',
            `Visitor ${visitorId} is already checked out`,
            'This visitor has already been checked out.'
          );
        }

        const visitor = await visitorRepository.checkout(visitorId);

        // Broadcast visitor signout event
        if (!visitor.checkOutTime) {
          throw new Error('Checkout time was not set');
        }

        broadcastVisitorSignout({
          visitorId: visitor.id,
          checkOutTime: visitor.checkOutTime.toISOString(),
        });

        results.push({ id: visitorId, type: 'visitor', success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: visitorId, type: 'visitor', success: false, error: errorMessage });
      }
    }

    // Broadcast single presence update at the end
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.json({
      processed: successCount,
      failed: failedCount,
      results,
    });
  } catch (err) {
    next(err);
  }
});

export { router as checkinRoutes };
