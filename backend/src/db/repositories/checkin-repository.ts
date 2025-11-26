import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Checkin,
  CheckinWithMember,
  CreateCheckinInput,
  PresenceStats,
  MemberWithDivision,
  Member,
  Division,
} from '../../../../shared/types';
import { redis } from '../redis';

interface CheckinFilters {
  memberId?: string;
  badgeId?: string;
  kioskId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface MemberPresenceItem {
  member: MemberWithDivision;
  status: 'present' | 'absent';
  lastCheckin?: Checkin;
}

export class CheckinRepository extends BaseRepository {
  private readonly PRESENCE_CACHE_KEY = 'presence:stats';
  private readonly PRESENCE_CACHE_TTL = 60; // 60 seconds

  /**
   * Find all checkins with optional filters
   */
  async findAll(filters?: CheckinFilters): Promise<Checkin[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.memberId) {
      conditions.push(`member_id = $${paramIndex++}`);
      params.push(filters.memberId);
    }

    if (filters?.badgeId) {
      conditions.push(`badge_id = $${paramIndex++}`);
      params.push(filters.badgeId);
    }

    if (filters?.kioskId) {
      conditions.push(`kiosk_id = $${paramIndex++}`);
      params.push(filters.kioskId);
    }

    if (filters?.dateRange) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.dateRange.start);
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.dateRange.end);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT *
      FROM checkins
      ${whereClause}
      ORDER BY timestamp DESC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, params);
    return rows.map((row) => toCamelCase<Checkin>(row));
  }

  /**
   * Find checkin by ID
   */
  async findById(id: string): Promise<Checkin | null> {
    const query = `
      SELECT *
      FROM checkins
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    return toCamelCase<Checkin>(row);
  }

  /**
   * Find latest checkin for a member
   */
  async findLatestByMember(memberId: string): Promise<Checkin | null> {
    const query = `
      SELECT *
      FROM checkins
      WHERE member_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [memberId]);
    if (!row) {
      return null;
    }

    return toCamelCase<Checkin>(row);
  }

  /**
   * Create a new checkin
   */
  async create(data: CreateCheckinInput): Promise<Checkin> {
    if (data.synced === undefined) {
      data.synced = true;
    }

    const query = `
      INSERT INTO checkins (
        member_id, badge_id, direction, timestamp, kiosk_id, synced
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.memberId,
      data.badgeId,
      data.direction,
      data.timestamp,
      data.kioskId !== undefined ? data.kioskId : null,
      data.synced,
    ]);

    if (!row) {
      throw new Error('Failed to create checkin');
    }

    await this.invalidatePresenceCache();
    return toCamelCase<Checkin>(row);
  }

  /**
   * Get presence statistics
   */
  async getPresenceStats(): Promise<PresenceStats> {
    // Try to get from cache first
    const cached = await redis.get(this.PRESENCE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate stats
    const query = `
      WITH latest_checkins AS (
        SELECT DISTINCT ON (member_id)
          member_id,
          direction
        FROM checkins
        ORDER BY member_id, timestamp DESC
      ),
      member_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE m.status = 'active') as total_members,
          COUNT(*) FILTER (WHERE m.status = 'leave') as on_leave,
          COUNT(*) FILTER (WHERE m.status = 'active' AND lc.direction = 'in') as present,
          COUNT(*) FILTER (WHERE m.status = 'active' AND (lc.direction = 'out' OR lc.direction IS NULL)) as absent
        FROM members m
        LEFT JOIN latest_checkins lc ON m.id = lc.member_id
      ),
      late_arrivals AS (
        SELECT COUNT(DISTINCT member_id) as count
        FROM checkins
        WHERE direction = 'in'
          AND timestamp::date = CURRENT_DATE
          AND EXTRACT(HOUR FROM timestamp) >= 8
      ),
      active_visitors AS (
        SELECT COUNT(*) as count
        FROM visitors
        WHERE check_out_time IS NULL
      )
      SELECT
        mc.total_members,
        mc.present,
        mc.absent,
        mc.on_leave,
        la.count as late_arrivals,
        av.count as visitors
      FROM member_counts mc
      CROSS JOIN late_arrivals la
      CROSS JOIN active_visitors av
    `;

    const row = await this.queryOne<Record<string, unknown>>(query);
    if (!row) {
      throw new Error('Failed to get presence stats');
    }

    const stats: PresenceStats = {
      totalMembers: Number(row.total_members || 0),
      present: Number(row.present || 0),
      absent: Number(row.absent || 0),
      onLeave: Number(row.on_leave || 0),
      lateArrivals: Number(row.late_arrivals || 0),
      visitors: Number(row.visitors || 0),
    };

    // Cache the result
    await redis.setex(this.PRESENCE_CACHE_KEY, this.PRESENCE_CACHE_TTL, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get member presence list with their current status
   */
  async getMemberPresenceList(): Promise<MemberPresenceItem[]> {
    const query = `
      SELECT
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status, m.email, m.phone,
        m.badge_id, m.created_at as member_created_at, m.updated_at as member_updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at,
        c.id as checkin_id, c.member_id as checkin_member_id, c.badge_id as checkin_badge_id,
        c.direction, c.timestamp, c.kiosk_id, c.synced, c.created_at as checkin_created_at
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM checkins
        WHERE member_id = m.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) c ON true
      WHERE m.status = 'active'
      ORDER BY m.last_name, m.first_name
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query);

    return rows.map((row) => {
      const member: MemberWithDivision = {
        id: row.id as string,
        serviceNumber: row.service_number as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        rank: row.rank as string,
        divisionId: row.division_id as string,
        memberType: row.member_type as 'class_a' | 'class_b' | 'class_c' | 'reg_force',
        status: row.status as 'active' | 'inactive' | 'pending_review',
        email: row.email as string | undefined,
        homePhone: row.home_phone as string | undefined,
        mobilePhone: row.mobile_phone as string | undefined,
        badgeId: row.badge_id as string | undefined,
        createdAt: row.member_created_at as Date,
        updatedAt: row.member_updated_at as Date,
        division: {
          id: row.division_id as string,
          name: row.division_name as string,
          code: row.division_code as string,
          description: row.division_description as string | undefined,
          createdAt: row.division_created_at as Date,
          updatedAt: row.division_updated_at as Date,
        },
      };

      let lastCheckin: Checkin | undefined;
      if (row.checkin_id) {
        lastCheckin = {
          id: row.checkin_id as string,
          memberId: row.checkin_member_id as string,
          badgeId: row.checkin_badge_id as string,
          direction: row.direction as 'in' | 'out',
          timestamp: row.timestamp as Date,
          kioskId: row.kiosk_id as string | undefined,
          synced: row.synced as boolean,
          createdAt: row.checkin_created_at as Date,
        };
      }

      const status: 'present' | 'absent' =
        row.direction === 'in' ? 'present' : 'absent';

      return {
        member,
        status,
        lastCheckin,
      };
    });
  }

  /**
   * Invalidate presence cache in Redis
   */
  private async invalidatePresenceCache(): Promise<void> {
    await redis.del(this.PRESENCE_CACHE_KEY);
  }
}

export const checkinRepository = new CheckinRepository();
