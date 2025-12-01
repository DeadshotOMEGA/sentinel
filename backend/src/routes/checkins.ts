import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { checkinService } from '../services/checkin-service';
import { presenceService } from '../services/presence-service';
import { processBulkCheckins } from '../services/sync-service';
import { requireAuth, requireDisplayAuth } from '../auth';
import { ValidationError } from '../utils/errors';
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
    localTimestamp: z.number().optional(),
    sequenceNumber: z.number().optional(),
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

export { router as checkinRoutes };
