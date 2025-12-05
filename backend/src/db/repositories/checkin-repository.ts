import type {
  Checkin,
  CheckinWithMember,
  CreateCheckinInput,
  PresenceStats,
  MemberWithDivision,
  Member,
  Division,
  PaginationParams,
} from '../../../../shared/types';
import { prisma, Prisma } from '../prisma';
import { redis } from '../redis';
import { getKioskName } from '../../utils/kiosk-names';

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

interface PresentMember {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  division: string;
  divisionId: string;
  memberType: 'class_a' | 'class_b' | 'class_c' | 'reg_force';
  mess: string | null;
  checkedInAt: string;
  kioskId?: string;
}

export class CheckinRepository {
  private readonly PRESENCE_CACHE_KEY = 'presence:stats';
  private readonly PRESENCE_CACHE_TTL = 60; // 60 seconds

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters?: CheckinFilters): Prisma.CheckinWhereInput {
    const where: Prisma.CheckinWhereInput = {};

    if (filters?.memberId) {
      where.memberId = filters.memberId;
    }

    if (filters?.badgeId) {
      where.badgeId = filters.badgeId;
    }

    if (filters?.kioskId) {
      where.kioskId = filters.kioskId;
    }

    if (filters?.dateRange) {
      where.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return where;
  }

  /**
   * Convert Prisma Checkin to application Checkin type
   */
  private toCheckin(prismaCheckin: {
    id: string;
    memberId: string | null;
    badgeId: string | null;
    direction: string;
    timestamp: Date;
    kioskId: string;
    synced: boolean | null;
    createdAt: Date | null;
    method?: string | null;
    createdByAdmin?: string | null;
  }): Checkin {
    if (!prismaCheckin.memberId || !prismaCheckin.badgeId) {
      throw new Error('Checkin missing required memberId or badgeId');
    }

    const method = prismaCheckin.method === 'admin_manual' ? 'admin_manual' : 'badge';
    const synced = prismaCheckin.synced === false ? false : true;
    const createdAt = prismaCheckin.createdAt ? prismaCheckin.createdAt : prismaCheckin.timestamp;

    return {
      id: prismaCheckin.id,
      memberId: prismaCheckin.memberId,
      badgeId: prismaCheckin.badgeId,
      direction: prismaCheckin.direction as 'in' | 'out',
      timestamp: prismaCheckin.timestamp,
      kioskId: prismaCheckin.kioskId,
      synced,
      method,
      createdByAdmin: prismaCheckin.createdByAdmin ? prismaCheckin.createdByAdmin : undefined,
      createdAt,
    };
  }

  /**
   * Find all checkins with optional filters
   */
  async findAll(filters?: CheckinFilters): Promise<Checkin[]> {
    const where = this.buildWhereClause(filters);

    const checkins = await prisma.checkin.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return checkins.map((c) => this.toCheckin(c));
  }

  /**
   * Find paginated checkins with optional filters
   */
  async findPaginated(
    params: PaginationParams,
    filters?: CheckinFilters
  ): Promise<{ checkins: Checkin[]; total: number }> {
    if (!params.page || params.page < 1) {
      throw new Error('Invalid page number: must be >= 1');
    }
    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new Error('Invalid limit: must be between 1 and 100');
    }

    const page = params.page;
    const limit = params.limit;
    const sortOrder = params.sortOrder ?? 'desc';

    // Validate sortBy column
    const allowedSortColumns: Record<string, keyof Prisma.CheckinOrderByWithRelationInput> = {
      timestamp: 'timestamp',
      direction: 'direction',
    };
    const sortByColumn = params.sortBy && allowedSortColumns[params.sortBy]
      ? allowedSortColumns[params.sortBy]
      : 'timestamp';

    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);

    const [total, checkins] = await Promise.all([
      prisma.checkin.count({ where }),
      prisma.checkin.findMany({
        where,
        orderBy: { [sortByColumn]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      checkins: checkins.map((c) => this.toCheckin(c)),
      total,
    };
  }

  /**
   * Find checkin by ID
   */
  async findById(id: string): Promise<Checkin | null> {
    const checkin = await prisma.checkin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return null;
    }

    return this.toCheckin(checkin);
  }

  /**
   * Find latest checkin for a member
   */
  async findLatestByMember(memberId: string): Promise<Checkin | null> {
    const checkin = await prisma.checkin.findFirst({
      where: { memberId },
      orderBy: { timestamp: 'desc' },
    });

    if (!checkin) {
      return null;
    }

    return this.toCheckin(checkin);
  }

  /**
   * Find latest checkins for multiple members (batch operation to prevent N+1 queries)
   * Returns a map of memberId -> latest checkin
   */
  async findLatestByMembers(memberIds: string[]): Promise<Map<string, Checkin>> {
    if (memberIds.length === 0) {
      return new Map();
    }

    // Use raw query for DISTINCT ON (not supported in Prisma)
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        member_id: string;
        badge_id: string;
        direction: string;
        timestamp: Date;
        kiosk_id: string;
        synced: boolean | null;
        created_at: Date | null;
        method: string | null;
        created_by_admin: string | null;
      }>
    >`
      SELECT DISTINCT ON (member_id) *
      FROM checkins
      WHERE member_id = ANY(${memberIds}::uuid[])
      ORDER BY member_id, timestamp DESC
    `;

    const resultMap = new Map<string, Checkin>();

    rows.forEach((row) => {
      const method = row.method === 'admin_manual' ? 'admin_manual' : 'badge';
      const synced = row.synced === false ? false : true;
      const createdAt = row.created_at ? row.created_at : row.timestamp;

      resultMap.set(row.member_id, {
        id: row.id,
        memberId: row.member_id,
        badgeId: row.badge_id,
        direction: row.direction as 'in' | 'out',
        timestamp: row.timestamp,
        kioskId: row.kiosk_id,
        synced,
        method,
        createdByAdmin: row.created_by_admin ? row.created_by_admin : undefined,
        createdAt,
      });
    });

    return resultMap;
  }

  /**
   * Create a new checkin
   */
  async create(data: CreateCheckinInput): Promise<Checkin> {
    if (!data.kioskId) {
      throw new Error('kioskId is required for checkin creation');
    }

    if (data.synced === undefined) {
      data.synced = true;
    }

    // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
    await this.invalidatePresenceCache();

    const checkin = await prisma.checkin.create({
      data: {
        memberId: data.memberId,
        badgeId: data.badgeId,
        direction: data.direction,
        timestamp: data.timestamp,
        kioskId: data.kioskId,
        synced: data.synced,
        // Note: flaggedForReview and flagReason are not in the current schema
        // If they need to be added, update the Prisma schema first
      },
    });

    return this.toCheckin(checkin);
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

    // Calculate stats using raw query for performance (preserves complex CTEs)
    const rows = await prisma.$queryRaw<
      Array<{
        total_members: bigint;
        present: bigint;
        absent: bigint;
        on_leave: bigint;
        late_arrivals: bigint;
        visitors: bigint;
      }>
    >`
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

    if (!rows || rows.length === 0) {
      throw new Error('Failed to get presence stats');
    }

    const row = rows[0];
    const stats: PresenceStats = {
      totalMembers: Number(row.total_members),
      present: Number(row.present),
      absent: Number(row.absent),
      onLeave: Number(row.on_leave),
      lateArrivals: Number(row.late_arrivals),
      visitors: Number(row.visitors),
    };

    // Cache the result
    await redis.setex(this.PRESENCE_CACHE_KEY, this.PRESENCE_CACHE_TTL, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get currently present members (public for TV display)
   */
  async getPresentMembers(): Promise<PresentMember[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        rank: string;
        mess: string | null;
        division_id: string;
        division_name: string;
        member_type: string;
        checked_in_at: Date;
        kiosk_id: string | null;
      }>
    >`
      WITH latest_checkins AS (
        SELECT DISTINCT ON (member_id)
          member_id,
          direction,
          timestamp,
          kiosk_id
        FROM checkins
        ORDER BY member_id, timestamp DESC
      )
      SELECT
        m.id,
        m.first_name,
        m.last_name,
        m.rank,
        m.mess,
        m.division_id,
        d.name as division_name,
        m.member_type,
        lc.timestamp as checked_in_at,
        lc.kiosk_id
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      INNER JOIN latest_checkins lc ON m.id = lc.member_id
      WHERE m.status = 'active' AND lc.direction = 'in'
      ORDER BY lc.timestamp DESC
    `;

    return rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      rank: row.rank,
      division: row.division_name,
      divisionId: row.division_id,
      memberType: row.member_type as 'class_a' | 'class_b' | 'class_c' | 'reg_force',
      mess: row.mess,
      checkedInAt: row.checked_in_at.toISOString(),
      kioskId: row.kiosk_id ?? undefined,
    }));
  }

  /**
   * Get member presence list with their current status
   */
  async getMemberPresenceList(): Promise<MemberPresenceItem[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        service_number: string;
        employee_number: string | null;
        first_name: string;
        last_name: string;
        initials: string | null;
        rank: string;
        division_id: string;
        mess: string | null;
        moc: string | null;
        member_type: string;
        class_details: string | null;
        status: string;
        email: string | null;
        home_phone: string | null;
        mobile_phone: string | null;
        badge_id: string | null;
        member_created_at: Date;
        member_updated_at: Date;
        division_name: string;
        division_code: string;
        division_description: string | null;
        division_created_at: Date;
        division_updated_at: Date;
        checkin_id: string | null;
        checkin_member_id: string | null;
        checkin_badge_id: string | null;
        direction: string | null;
        timestamp: Date | null;
        kiosk_id: string | null;
        synced: boolean | null;
        checkin_created_at: Date | null;
        checkin_method: string | null;
        checkin_created_by_admin: string | null;
      }>
    >`
      SELECT
        m.id, m.service_number, m.employee_number, m.first_name, m.last_name, m.initials, m.rank,
        m.division_id, m.mess, m.moc, m.member_type, m.class_details, m.status, m.email, m.home_phone, m.mobile_phone,
        m.badge_id, m.created_at as member_created_at, m.updated_at as member_updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at,
        c.id as checkin_id, c.member_id as checkin_member_id, c.badge_id as checkin_badge_id,
        c.direction, c.timestamp, c.kiosk_id, c.synced, c.created_at as checkin_created_at,
        c.method as checkin_method, c.created_by_admin as checkin_created_by_admin
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

    return rows.map((row) => {
      const member: MemberWithDivision = {
        id: row.id,
        serviceNumber: row.service_number,
        employeeNumber: row.employee_number ?? undefined,
        firstName: row.first_name,
        lastName: row.last_name,
        initials: row.initials ?? undefined,
        rank: row.rank,
        divisionId: row.division_id,
        mess: row.mess ?? undefined,
        moc: row.moc ?? undefined,
        memberType: row.member_type as 'class_a' | 'class_b' | 'class_c' | 'reg_force',
        classDetails: row.class_details ?? undefined,
        status: row.status as 'active' | 'inactive' | 'pending_review',
        email: row.email ?? undefined,
        homePhone: row.home_phone ?? undefined,
        mobilePhone: row.mobile_phone ?? undefined,
        badgeId: row.badge_id ?? undefined,
        createdAt: row.member_created_at,
        updatedAt: row.member_updated_at,
        division: {
          id: row.division_id,
          name: row.division_name,
          code: row.division_code,
          description: row.division_description ?? undefined,
          createdAt: row.division_created_at,
          updatedAt: row.division_updated_at,
        },
      };

      let lastCheckin: Checkin | undefined;
      if (row.checkin_id && row.checkin_member_id && row.checkin_badge_id && row.timestamp && row.kiosk_id !== null) {
        const checkinMethod = row.checkin_method === 'admin_manual' ? 'admin_manual' : 'badge';
        const checkinSynced = row.synced === false ? false : true;
        const checkinCreatedAt = row.checkin_created_at ? row.checkin_created_at : row.timestamp;

        lastCheckin = {
          id: row.checkin_id,
          memberId: row.checkin_member_id,
          badgeId: row.checkin_badge_id,
          direction: row.direction as 'in' | 'out',
          timestamp: row.timestamp,
          kioskId: row.kiosk_id,
          synced: checkinSynced,
          method: checkinMethod,
          createdByAdmin: row.checkin_created_by_admin ? row.checkin_created_by_admin : undefined,
          createdAt: checkinCreatedAt,
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

  /**
   * Get recent activity (checkins + visitors) for display
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivityItem[]> {
    // Use raw query for UNION (not supported in Prisma)
    const rows = await prisma.$queryRaw<
      Array<{
        type: string;
        id: string;
        timestamp: Date;
        direction: string;
        name: string;
        rank: string | null;
        division: string | null;
        kiosk_id: string | null;
        organization: string | null;
        visit_type: string | null;
        visit_reason: string | null;
        host_name: string | null;
        event_id: string | null;
        event_name: string | null;
      }>
    >`
      (
        SELECT
          'checkin' as type,
          c.id,
          c.timestamp,
          c.direction,
          m.first_name || ' ' || m.last_name as name,
          m.rank,
          d.name as division,
          c.kiosk_id,
          NULL as organization,
          NULL as visit_type,
          NULL as visit_reason,
          NULL as host_name,
          NULL as event_id,
          NULL as event_name
        FROM checkins c
        JOIN members m ON c.member_id = m.id
        LEFT JOIN divisions d ON m.division_id = d.id
        ORDER BY c.timestamp DESC
        LIMIT ${limit}
      )
      UNION ALL
      (
        SELECT
          'visitor' as type,
          v.id,
          v.check_in_time as timestamp,
          CASE WHEN v.check_out_time IS NULL THEN 'in' ELSE 'out' END as direction,
          v.name,
          NULL as rank,
          NULL as division,
          v.kiosk_id,
          v.organization,
          v.visit_type,
          v.visit_reason,
          CASE WHEN hm.id IS NOT NULL THEN hm.rank || ' ' || hm.first_name || ' ' || hm.last_name ELSE NULL END as host_name,
          v.event_id,
          e.name as event_name
        FROM visitors v
        LEFT JOIN members hm ON v.host_member_id = hm.id
        LEFT JOIN events e ON v.event_id = e.id
        WHERE v.check_in_time > NOW() - INTERVAL '24 hours'
        ORDER BY v.check_in_time DESC
        LIMIT ${limit}
      )
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      type: row.type as 'checkin' | 'visitor',
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      direction: row.direction as 'in' | 'out',
      name: row.name,
      rank: row.rank ?? undefined,
      division: row.division ?? undefined,
      kioskId: row.kiosk_id ?? undefined,
      kioskName: row.kiosk_id ? getKioskName(row.kiosk_id) : undefined,
      organization: row.organization ?? undefined,
      visitType: row.visit_type ?? undefined,
      visitReason: row.visit_reason ?? undefined,
      hostName: row.host_name ?? undefined,
      eventId: row.event_id ?? undefined,
      eventName: row.event_name ?? undefined,
    }));
  }
}

interface RecentActivityItem {
  type: 'checkin' | 'visitor';
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  name: string;
  // Member fields
  rank?: string;
  division?: string;
  // Location
  kioskId?: string;
  kioskName?: string;
  // Visitor fields
  organization?: string;
  visitType?: string;
  visitReason?: string;
  hostName?: string;
  // Event context
  eventId?: string;
  eventName?: string;
}

export const checkinRepository = new CheckinRepository();
