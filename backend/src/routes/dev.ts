import { Router, type Request, type Response, type NextFunction } from 'express';
import { pool } from '../db/connection';
import { requireAuth } from '../auth';
import { broadcastPresenceUpdate } from '../websocket';
import { checkinRepository } from '../db/repositories/checkin-repository';

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
    const query = `
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

    const result = await pool.query(query);

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

    const members: MemberWithBadge[] = result.rows.map((row: MemberRow) => ({
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
    // Get all currently present members
    const presentQuery = `
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

    const presentResult = await pool.query(presentQuery);

    if (presentResult.rows.length === 0) {
      res.json({ message: 'No one is currently checked in', clearedCount: 0 });
      return;
    }

    // Insert check-out records for all present members
    const insertQuery = `
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

    await pool.query(insertQuery);

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    res.json({
      message: `Cleared ${presentResult.rows.length} check-ins`,
      clearedCount: presentResult.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

export { router as devRoutes };
