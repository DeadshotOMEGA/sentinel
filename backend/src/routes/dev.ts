import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth } from '../auth';
import { broadcastPresenceUpdate } from '../websocket';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { checkinService } from '../services/checkin-service';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import type { MockScanResponse } from '../../../shared/types/dev-mode';

const router = Router();

// Middleware to block in production
router.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'DEV routes are disabled in production' });
    return;
  }
  next();
});

interface MemberWithBadge {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  division: string;
  divisionId: string;
  mess: string | null;
  badgeSerialNumber: string | null;
  isPresent: boolean;
}

// GET /api/dev/members - Get all members with badge info and presence status
router.get('/members', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    interface MemberRow {
      id: string;
      first_name: string;
      last_name: string;
      rank: string;
      mess: string | null;
      division_id: string;
      division_name: string;
      badge_serial_number: string | null;
      is_present: boolean;
    }

    const rows = await prisma.$queryRaw<MemberRow[]>`
      WITH latest_checkins AS (
        SELECT DISTINCT ON (member_id)
          member_id,
          direction
        FROM checkins
        ORDER BY member_id, timestamp DESC
      )
      SELECT
        m.id,
        m.first_name,
        m.last_name,
        m.rank,
        m.mess,
        d.id as division_id,
        d.name as division_name,
        b.serial_number as badge_serial_number,
        COALESCE(lc.direction = 'in', false) as is_present
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      LEFT JOIN badges b ON b.assigned_to_id = m.id AND b.assignment_type = 'member' AND b.status = 'active'
      LEFT JOIN latest_checkins lc ON m.id = lc.member_id
      WHERE m.status = 'active'
      ORDER BY d.name, m.last_name, m.first_name
    `;

    const members: MemberWithBadge[] = rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      rank: row.rank,
      division: row.division_name,
      divisionId: row.division_id,
      mess: row.mess,
      badgeSerialNumber: row.badge_serial_number,
      isPresent: row.is_present,
    }));

    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dev/checkins/clear-all - Check out all currently present members
router.delete('/checkins/clear-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    interface PresentRow {
      member_id: string;
      badge_id: string;
    }

    // Get all currently present members
    const presentRows = await prisma.$queryRaw<PresentRow[]>`
      WITH latest_checkins AS (
        SELECT DISTINCT ON (member_id)
          member_id,
          badge_id,
          direction
        FROM checkins
        ORDER BY member_id, timestamp DESC
      )
      SELECT member_id, badge_id
      FROM latest_checkins
      WHERE direction = 'in'
    `;

    if (presentRows.length === 0) {
      res.json({ message: 'No one is currently checked in', clearedCount: 0 });
      return;
    }

    // Insert check-out records for all present members
    await prisma.$executeRaw`
      INSERT INTO checkins (member_id, badge_id, direction, timestamp, kiosk_id, synced)
      SELECT
        member_id,
        badge_id,
        'out',
        NOW(),
        'dev-clear-all',
        true
      FROM (
        WITH latest_checkins AS (
          SELECT DISTINCT ON (member_id)
            member_id,
            badge_id,
            direction
          FROM checkins
          ORDER BY member_id, timestamp DESC
        )
        SELECT member_id, badge_id
        FROM latest_checkins
        WHERE direction = 'in'
      ) present_members
    `;

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    res.json({
      message: `Cleared ${presentRows.length} check-ins`,
      clearedCount: presentRows.length,
    });
  } catch (err) {
    next(err);
  }
});

// Validation schema for mock scan
const mockScanSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  timestamp: z.string().datetime().optional(),
  kioskId: z.string().optional().default('dev-mock-scanner'),
});

// POST /api/dev/mock-scan - Simulate RFID badge scan
router.post('/mock-scan', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extra production guard (middleware already blocks, but belt and suspenders)
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Dev routes disabled in production' });
      return;
    }

    const validationResult = mockScanSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(
        'INVALID_MOCK_SCAN_DATA',
        validationResult.error.message,
        'Invalid mock scan data. Please check the badge serial number and try again.'
      );
    }

    const { serialNumber, timestamp, kioskId } = validationResult.data;

    // Delegate to checkinService - this ensures mock scans:
    // - Create real checkin records in database
    // - Trigger WebSocket broadcasts to all clients
    // - Behave identically to hardware scans
    const result = await checkinService.processCheckin(serialNumber, {
      timestamp: timestamp ? new Date(timestamp) : undefined,
      kioskId,
    });

    const response: MockScanResponse = {
      success: true,
      direction: result.direction,
      member: {
        id: result.member.id,
        firstName: result.member.firstName,
        lastName: result.member.lastName,
        rank: result.member.rank,
        division: result.member.division.name,
      },
    };

    res.status(201).json(response);
  } catch (err) {
    // Handle known error types and format as MockScanResponse
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) {
      const response: MockScanResponse = {
        success: false,
        direction: 'in', // Default direction for failed scans
        error: err.howToFix ?? err.details ?? err.message,
      };
      res.status(err.statusCode).json(response);
      return;
    }
    next(err);
  }
});

export { router as devRoutes };
