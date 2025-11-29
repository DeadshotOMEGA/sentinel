import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { processBulkCheckins } from '../services/sync-service';
import { requireAuth, requireDisplayAuth } from '../auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import type { CheckinDirection } from '../../../shared/types';
import { broadcastCheckin, broadcastPresenceUpdate } from '../websocket';
import { kioskLimiter, bulkLimiter } from '../middleware/rate-limit';

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
  })),
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
    const scanTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Look up badge by serial number
    const badge = await badgeRepository.findBySerialNumber(serialNumber);
    if (!badge) {
      throw new NotFoundError(
        'BADGE_NOT_FOUND',
        `Badge with serial number ${serialNumber} not found`,
        'This badge is not registered in the system. Please contact an administrator.'
      );
    }

    // Check if badge is assigned
    if (badge.assignmentType === 'unassigned' || !badge.assignedToId) {
      throw new ValidationError(
        'BADGE_NOT_ASSIGNED',
        `Badge ${serialNumber} is not assigned to any member`,
        'This badge is not assigned to a member. Please contact an administrator.'
      );
    }

    // Check badge status
    if (badge.status !== 'active') {
      throw new ValidationError(
        'BADGE_INACTIVE',
        `Badge ${serialNumber} is ${badge.status}`,
        `This badge is ${badge.status}. Please contact an administrator.`
      );
    }

    // Only support member badges for now (not event attendees)
    if (badge.assignmentType !== 'member') {
      throw new ValidationError(
        'UNSUPPORTED_BADGE_TYPE',
        `Badge type ${badge.assignmentType} not supported for check-in`,
        'This badge type is not supported for check-in. Please contact an administrator.'
      );
    }

    const memberId = badge.assignedToId;

    // Get member info
    const member = await memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member assigned to this badge does not exist. Please contact an administrator.'
      );
    }

    // Get member's last checkin to determine direction
    const lastCheckin = await checkinRepository.findLatestByMember(memberId);

    // Determine direction (opposite of last, or 'in' if no history)
    let direction: CheckinDirection = 'in';
    if (lastCheckin) {
      direction = lastCheckin.direction === 'in' ? 'out' : 'in';

      // Check for duplicate scans within 5 seconds
      const timeDiff = scanTimestamp.getTime() - lastCheckin.timestamp.getTime();
      if (Math.abs(timeDiff) < 5000) {
        throw new ConflictError(
          'DUPLICATE_SCAN',
          'Duplicate scan within 5 seconds',
          'Please wait a few seconds before scanning again.'
        );
      }
    }

    // Create checkin record
    const checkin = await checkinRepository.create({
      memberId,
      badgeId: badge.id,
      direction,
      timestamp: scanTimestamp,
      kioskId,
      synced: true,
    });

    // Broadcast checkin event to WebSocket clients
    if (!kioskId) {
      throw new ValidationError(
        'KIOSK_ID_REQUIRED',
        'Kiosk ID is required for broadcasting checkin events',
        'Please ensure the kiosk ID is provided in the request.'
      );
    }

    broadcastCheckin({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      rank: member.rank,
      division: member.division.name,
      direction,
      timestamp: scanTimestamp.toISOString(),
      kioskId,
    });

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    // Return member info + direction
    res.status(201).json({
      checkin,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        serviceNumber: member.serviceNumber,
        division: member.division,
      },
      direction,
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
    const stats = await checkinRepository.getPresenceStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/presence/present - Currently present members (requires display auth)
router.get('/presence/present', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentMembers = await checkinRepository.getPresentMembers();

    // Display auth already gets filtered data (no service numbers, contact info)
    // Full admin auth gets all available fields
    res.json({ members: presentMembers });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/presence/list - All members with presence status
router.get('/presence/list', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presenceList = await checkinRepository.getMemberPresenceList();
    res.json({ presenceList });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/recent - Recent activity (checkins + visitors) - requires display auth
router.get('/recent', requireDisplayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const activity = await checkinRepository.getRecentActivity(limit);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

export { router as checkinRoutes };
