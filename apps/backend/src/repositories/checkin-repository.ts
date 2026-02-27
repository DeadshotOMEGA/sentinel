import { DateTime } from 'luxon'

import type {
  Checkin,
  CheckinWithMember,
  CreateCheckinInput,
  PresenceStats,
  MemberWithDivision,
  PaginationParams,
  MemberType,
  MemberStatus,
} from '@sentinel/types'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'
import { DEFAULT_TIMEZONE, OPERATIONAL_DAY_START_HOUR } from '../utils/operational-date.js'

// TODO: Implement Redis caching when infrastructure is ready
// import { redis } from '../redis';

// TODO: Implement kiosk names utility
// import { getKioskName } from '../../utils/kiosk-names';

interface CheckinFilters {
  memberId?: string
  badgeId?: string
  kioskId?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface MemberPresenceItem {
  member: MemberWithDivision
  status: 'present' | 'absent'
  lastCheckin?: Checkin
}

export interface PresentMember {
  id: string
  firstName: string
  lastName: string
  initials?: string
  displayName?: string
  rank: string
  rankSortOrder: number
  division: string
  divisionCode: string
  divisionId: string | null
  memberType: 'class_a' | 'class_b' | 'class_c' | 'reg_force'
  mess: string | null
  checkedInAt: string
  kioskId?: string
}

export class CheckinRepository {
  private prisma: PrismaClientInstance

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters?: CheckinFilters): Prisma.CheckinWhereInput {
    const where: Prisma.CheckinWhereInput = {}

    if (filters?.memberId) {
      where.memberId = filters.memberId
    }

    if (filters?.badgeId) {
      where.badgeId = filters.badgeId
    }

    if (filters?.kioskId) {
      where.kioskId = filters.kioskId
    }

    if (filters?.dateRange) {
      where.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      }
    }

    return where
  }

  /**
   * Convert Prisma Checkin to application Checkin type
   */
  private toCheckin(prismaCheckin: {
    id: string
    memberId: string | null
    badgeId: string | null
    direction: string
    timestamp: Date
    kioskId: string
    synced: boolean | null
    createdAt: Date | null
    method?: string | null
    createdByAdmin?: string | null
  }): Checkin {
    if (!prismaCheckin.memberId) {
      throw new Error(`Checkin ${prismaCheckin.id} missing required memberId`)
    }

    const method = prismaCheckin.method ?? 'badge'
    const synced = prismaCheckin.synced === false ? false : true
    const createdAt = prismaCheckin.createdAt ? prismaCheckin.createdAt : prismaCheckin.timestamp

    return {
      id: prismaCheckin.id,
      memberId: prismaCheckin.memberId,
      badgeId: prismaCheckin.badgeId ?? undefined,
      direction: prismaCheckin.direction.toLowerCase() as 'in' | 'out',
      timestamp: prismaCheckin.timestamp,
      kioskId: prismaCheckin.kioskId,
      synced,
      method,
      createdByAdmin: prismaCheckin.createdByAdmin ? prismaCheckin.createdByAdmin : undefined,
      createdAt,
    }
  }

  /**
   * Find all checkins with optional filters
   */
  async findAll(filters?: CheckinFilters): Promise<Checkin[]> {
    const where = this.buildWhereClause(filters)

    const checkins = await this.prisma.checkin.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    })

    return checkins.map((c) => this.toCheckin(c))
  }

  /**
   * Find paginated checkins with optional filters
   */
  async findPaginated(
    params: PaginationParams,
    filters?: CheckinFilters
  ): Promise<{ checkins: Checkin[]; total: number }> {
    if (!params.page || params.page < 1) {
      throw new Error('Invalid page number: must be >= 1')
    }
    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new Error('Invalid limit: must be between 1 and 100')
    }

    const page = params.page
    const limit = params.limit
    const sortOrder = params.sortOrder ?? 'desc'

    // Validate sortBy column
    const allowedSortColumns: Record<string, keyof Prisma.CheckinOrderByWithRelationInput> = {
      timestamp: 'timestamp',
      direction: 'direction',
    }
    const sortByColumn =
      params.sortBy && allowedSortColumns[params.sortBy]
        ? allowedSortColumns[params.sortBy]
        : 'timestamp'

    const skip = (page - 1) * limit
    const where = this.buildWhereClause(filters)

    const [total, checkins] = await Promise.all([
      this.prisma.checkin.count({ where }),
      this.prisma.checkin.findMany({
        where,
        orderBy: { [sortByColumn as string]: sortOrder },
        skip,
        take: limit,
      }),
    ])

    return {
      checkins: checkins.map((c) => this.toCheckin(c)),
      total,
    }
  }

  /**
   * Find checkin by ID
   */
  async findById(id: string): Promise<Checkin | null> {
    const checkin = await this.prisma.checkin.findUnique({
      where: { id },
    })

    if (!checkin) {
      return null
    }

    return this.toCheckin(checkin)
  }

  /**
   * Find latest checkin for a member
   */
  async findLatestByMember(memberId: string): Promise<Checkin | null> {
    const checkin = await this.prisma.checkin.findFirst({
      where: { memberId },
      orderBy: { timestamp: 'desc' },
    })

    if (!checkin) {
      return null
    }

    return this.toCheckin(checkin)
  }

  /**
   * Find latest checkins for multiple members (batch operation to prevent N+1 queries)
   * Returns a map of memberId -> latest checkin
   */
  async findLatestByMembers(memberIds: string[]): Promise<Map<string, Checkin>> {
    if (memberIds.length === 0) {
      return new Map()
    }

    // Use raw query for DISTINCT ON (not supported in Prisma)
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string
        member_id: string
        badge_id: string
        direction: string
        timestamp: Date
        kiosk_id: string
        synced: boolean | null
        created_at: Date | null
        method: string | null
        created_by_admin: string | null
      }>
    >`
      SELECT DISTINCT ON (member_id) *
      FROM checkins
      WHERE member_id = ANY(${memberIds}::uuid[])
      ORDER BY member_id, timestamp DESC
    `

    const resultMap = new Map<string, Checkin>()

    rows.forEach((row) => {
      const method = row.method === 'admin_manual' ? 'admin_manual' : 'badge'
      const synced = row.synced === false ? false : true
      const createdAt = row.created_at ? row.created_at : row.timestamp

      resultMap.set(row.member_id, {
        id: row.id,
        memberId: row.member_id,
        badgeId: row.badge_id,
        direction: row.direction.toLowerCase() as 'in' | 'out',
        timestamp: row.timestamp,
        kioskId: row.kiosk_id,
        synced,
        method,
        createdByAdmin: row.created_by_admin ? row.created_by_admin : undefined,
        createdAt,
      })
    })

    return resultMap
  }

  /**
   * Create a new checkin
   */
  async create(data: CreateCheckinInput): Promise<Checkin> {
    if (!data.kioskId) {
      throw new Error('kioskId is required for checkin creation')
    }

    if (data.synced === undefined) {
      data.synced = true
    }

    // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
    await this.invalidatePresenceCache()

    const checkin = await this.prisma.checkin.create({
      data: {
        memberId: data.memberId,
        badgeId: data.badgeId,
        direction: data.direction.toLowerCase(),
        timestamp: data.timestamp,
        kioskId: data.kioskId,
        method: data.method,
        synced: data.synced,
      },
    })

    return this.toCheckin(checkin)
  }

  /**
   * Bulk create checkins (for offline sync)
   */
  async bulkCreate(checkins: CreateCheckinInput[]): Promise<{
    success: number
    failed: number
    errors: Array<{ index: number; error: string }>
  }> {
    if (checkins.length === 0) {
      return { success: 0, failed: 0, errors: [] }
    }

    if (checkins.length > 100) {
      throw new Error('Cannot create more than 100 checkins at once')
    }

    await this.invalidatePresenceCache()

    const errors: Array<{ index: number; error: string }> = []
    let successCount = 0

    // Process each checkin individually to handle partial failures
    for (let i = 0; i < checkins.length; i++) {
      try {
        const checkin = checkins[i]
        if (!checkin) throw new Error('Checkin data missing')
        await this.create(checkin)
        successCount++
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      success: successCount,
      failed: errors.length,
      errors,
    }
  }

  /**
   * Update checkin (e.g., flag for review, change direction)
   */
  async update(id: string, data: { direction?: string; timestamp?: Date }): Promise<Checkin> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Checkin with ID '${id}' not found`)
    }

    await this.invalidatePresenceCache()

    const updated = await this.prisma.checkin.update({
      where: { id },
      data: {
        direction: data.direction,
        timestamp: data.timestamp,
      },
    })

    return this.toCheckin(updated)
  }

  /**
   * Delete checkin
   */
  async delete(id: string): Promise<void> {
    // Use findUnique directly — toCheckin() throws for member-less records (visitors)
    const existing = await this.prisma.checkin.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      throw new Error(`Checkin with ID '${id}' not found`)
    }

    await this.invalidatePresenceCache()

    await this.prisma.checkin.delete({
      where: { id },
    })
  }

  /**
   * Find checkin by ID with member details
   */
  async findByIdWithMember(id: string): Promise<CheckinWithMember | null> {
    const checkin = await this.prisma.checkin.findUnique({
      where: { id },
      include: {
        member: {
          include: {
            division: true,
          },
        },
      },
    })

    if (!checkin || !checkin.member) {
      return null
    }

    const division = checkin.member.division
    return {
      ...this.toCheckin(checkin),
      member: {
        id: checkin.member.id,
        serviceNumber: checkin.member.serviceNumber,
        employeeNumber: checkin.member.employeeNumber ?? undefined,
        displayName: checkin.member.displayName ?? undefined,
        firstName: checkin.member.firstName,
        lastName: checkin.member.lastName,
        initials: checkin.member.initials ?? undefined,
        rank: checkin.member.rank,
        divisionId: checkin.member.divisionId ?? '',
        mess: checkin.member.mess ?? undefined,
        moc: checkin.member.moc ?? undefined,
        memberType: checkin.member.memberType as unknown as MemberType,
        accountLevel: checkin.member.accountLevel,
        mustChangePin: checkin.member.mustChangePin,
        classDetails: checkin.member.classDetails ?? undefined,
        status: checkin.member.status as unknown as MemberStatus,
        email: checkin.member.email ?? undefined,
        homePhone: checkin.member.homePhone ?? undefined,
        mobilePhone: checkin.member.mobilePhone ?? undefined,
        badgeId: checkin.member.badgeId ?? undefined,
        createdAt: checkin.member.createdAt ?? new Date(),
        updatedAt: checkin.member.updatedAt ?? new Date(),
        division: division
          ? {
              id: division.id,
              name: division.name,
              code: division.code,
              description: division.description ?? undefined,
              createdAt: division.createdAt ?? new Date(),
              updatedAt: division.updatedAt ?? new Date(),
            }
          : {
              id: '',
              name: 'Unassigned',
              code: 'UNASSIGNED',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
      },
    }
  }

  /**
   * Find all checkins with member details (no pagination limit enforced)
   * Used for unified queries that merge members + visitors before paginating
   */
  async findAllWithMembers(
    filters?: CheckinFilters
  ): Promise<{ checkins: CheckinWithMember[]; total: number }> {
    const where = this.buildWhereClause(filters)

    const [total, checkins] = await Promise.all([
      this.prisma.checkin.count({ where }),
      this.prisma.checkin.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        include: {
          member: {
            include: {
              division: true,
            },
          },
        },
      }),
    ])

    return {
      checkins: checkins
        .filter((c) => c.member !== null)
        .map((c) => {
          const division = c.member!.division
          return {
            ...this.toCheckin(c),
            member: {
              id: c.member!.id,
              serviceNumber: c.member!.serviceNumber,
              displayName: c.member!.displayName || undefined,
              rank: c.member!.rank,
              firstName: c.member!.firstName,
              lastName: c.member!.lastName,
              divisionId: c.member!.divisionId ?? '',
              email: c.member!.email || undefined,
              mobilePhone: c.member!.mobilePhone || undefined,
              memberType: c.member!.memberType as MemberType,
              accountLevel: c.member!.accountLevel,
              mustChangePin: c.member!.mustChangePin,
              status: c.member!.status as MemberStatus,
              employeeNumber: c.member!.employeeNumber || undefined,
              initials: c.member!.initials || undefined,
              mess: c.member!.mess || undefined,
              moc: c.member!.moc || undefined,
              classDetails: c.member!.classDetails || undefined,
              homePhone: c.member!.homePhone || undefined,
              badgeId: c.member!.badgeId || undefined,
              notes: c.member!.notes || undefined,
              createdAt: c.member!.createdAt || new Date(),
              updatedAt: c.member!.updatedAt || new Date(),
              division: division
                ? {
                    id: division.id,
                    name: division.name,
                    code: division.code,
                    description: division.description || undefined,
                    createdAt: division.createdAt,
                    updatedAt: division.updatedAt,
                  }
                : {
                    id: '',
                    name: 'Unassigned',
                    code: 'UNASSIGNED',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
              memberTypeId: c.member!.memberTypeId || undefined,
              memberStatusId: c.member!.memberStatusId || undefined,
            },
          }
        }),
      total,
    }
  }

  /**
   * Find paginated checkins with member details
   */
  async findPaginatedWithMembers(
    params: PaginationParams,
    filters?: CheckinFilters
  ): Promise<{ checkins: CheckinWithMember[]; total: number }> {
    if (!params.page || params.page < 1) {
      throw new Error('Invalid page number: must be >= 1')
    }
    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new Error('Invalid limit: must be between 1 and 100')
    }

    const page = params.page
    const limit = params.limit
    const sortOrder = params.sortOrder ?? 'desc'

    // Validate sortBy column
    const allowedSortColumns: Record<string, keyof Prisma.CheckinOrderByWithRelationInput> = {
      timestamp: 'timestamp',
      direction: 'direction',
    }
    const sortByColumn =
      params.sortBy && allowedSortColumns[params.sortBy]
        ? allowedSortColumns[params.sortBy]
        : 'timestamp'

    const skip = (page - 1) * limit
    const where = this.buildWhereClause(filters)

    const [total, checkins] = await Promise.all([
      this.prisma.checkin.count({ where }),
      this.prisma.checkin.findMany({
        where,
        orderBy: { [sortByColumn as string]: sortOrder },
        skip,
        take: limit,
        include: {
          member: {
            include: {
              division: true,
            },
          },
        },
      }),
    ])

    return {
      checkins: checkins.map((c) => {
        if (!c.member) {
          throw new Error(`Checkin ${c.id} missing member data`)
        }

        const division = c.member.division
        return {
          ...this.toCheckin(c),
          member: {
            id: c.member.id,
            serviceNumber: c.member.serviceNumber,
            displayName: c.member.displayName || undefined,
            rank: c.member.rank,
            firstName: c.member.firstName,
            lastName: c.member.lastName,
            divisionId: c.member.divisionId ?? '',
            email: c.member.email || undefined,
            mobilePhone: c.member.mobilePhone || undefined,
            memberType: c.member.memberType as MemberType,
            accountLevel: c.member.accountLevel,
            mustChangePin: c.member.mustChangePin,
            status: c.member.status as MemberStatus,
            employeeNumber: c.member.employeeNumber || undefined,
            initials: c.member.initials || undefined,
            mess: c.member.mess || undefined,
            moc: c.member.moc || undefined,
            classDetails: c.member.classDetails || undefined,
            homePhone: c.member.homePhone || undefined,
            badgeId: c.member.badgeId || undefined,
            notes: c.member.notes || undefined,
            createdAt: c.member.createdAt || new Date(),
            updatedAt: c.member.updatedAt || new Date(),
            division: division
              ? {
                  id: division.id,
                  name: division.name,
                  code: division.code,
                  description: division.description || undefined,
                  createdAt: division.createdAt,
                  updatedAt: division.updatedAt,
                }
              : {
                  id: '',
                  name: 'Unassigned',
                  code: 'UNASSIGNED',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
            memberTypeId: c.member.memberTypeId || undefined,
            memberStatusId: c.member.memberStatusId || undefined,
          },
        }
      }),
      total,
    }
  }

  /**
   * Get presence statistics
   */
  async getPresenceStats(): Promise<PresenceStats> {
    // TODO: Implement Redis caching when infrastructure is ready
    // Try to get from cache first
    // const cached = await redis.get(this.PRESENCE_CACHE_KEY);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    // Calculate stats using raw query for performance (preserves complex CTEs)
    const rows = await this.prisma.$queryRaw<
      Array<{
        total_members: bigint
        present: bigint
        absent: bigint
        on_leave: bigint
        late_arrivals: bigint
        visitors: bigint
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
    `

    if (!rows || rows.length === 0) {
      throw new Error('Failed to get presence stats')
    }

    const row = rows[0]!
    const totalMembers = Number(row.total_members)
    const present = Number(row.present)
    const absent = Number(row.absent)

    const stats: PresenceStats = {
      total: totalMembers,
      totalMembers,
      present,
      absent,
      onLeave: Number(row.on_leave) || 0,
      percentagePresent: totalMembers > 0 ? (present / totalMembers) * 100 : 0,
      byDivision: [],
    }

    // TODO: Implement Redis caching when infrastructure is ready
    // Cache the result
    // await redis.setex(this.PRESENCE_CACHE_KEY, this.PRESENCE_CACHE_TTL, JSON.stringify(stats));

    return stats
  }

  /**
   * Get currently present members (public for TV display)
   */
  async getPresentMembers(): Promise<PresentMember[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string
        first_name: string
        last_name: string
        initials: string | null
        display_name: string | null
        rank: string
        rank_sort_order: number
        mess: string | null
        division_id: string
        division_name: string
        division_code: string
        member_type: string
        checked_in_at: Date
        kiosk_id: string | null
        tags: string | null
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
      ),
      -- Combine direct tag assignments with qualification-based tags
      all_member_tags AS (
        -- Direct tag assignments
        SELECT mt.member_id, mt.tag_id, 'direct' AS source
        FROM member_tags mt
        UNION
        -- Tags from active qualifications
        SELECT mq.member_id, qt.tag_id, 'qualification' AS source
        FROM member_qualifications mq
        JOIN qualification_types qt ON qt.id = mq.qualification_type_id
        WHERE mq.status = 'active' AND qt.tag_id IS NOT NULL
      ),
      member_tags_agg AS (
        SELECT
          amt.member_id,
          json_agg(
            json_build_object(
              'id', t.id,
              'name', t.name,
              'chipVariant', t.chip_variant,
              'chipColor', t.chip_color,
              'isPositional', t.is_positional,
              'displayOrder', t.display_order,
              'source', amt.source
            ) ORDER BY t.display_order, t.name
          ) as tags
        FROM all_member_tags amt
        INNER JOIN tags t ON amt.tag_id = t.id
        GROUP BY amt.member_id
      )
      SELECT
        m.id,
        m.first_name,
        m.last_name,
        m.initials,
        m.display_name,
        m.rank,
        COALESCE(r.display_order, 0) as rank_sort_order,
        m.mess,
        m.division_id,
        d.name as division_name,
        d.code as division_code,
        m.member_type,
        lc.timestamp as checked_in_at,
        lc.kiosk_id,
        mta.tags::text as tags
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      INNER JOIN latest_checkins lc ON m.id = lc.member_id
      LEFT JOIN ranks r ON m.rank_id = r.id
      LEFT JOIN member_tags_agg mta ON m.id = mta.member_id
      WHERE m.status = 'active' AND lc.direction = 'in'
      ORDER BY lc.timestamp DESC
    `

    return rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      initials: row.initials ?? undefined,
      displayName: row.display_name ?? undefined,
      rank: row.rank,
      rankSortOrder: Number(row.rank_sort_order),
      division: row.division_name,
      divisionCode: row.division_code,
      divisionId: row.division_id,
      memberType: row.member_type as 'class_a' | 'class_b' | 'class_c' | 'reg_force',
      mess: row.mess,
      checkedInAt: row.checked_in_at.toISOString(),
      kioskId: row.kiosk_id ?? undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }))
  }

  /**
   * Get member presence list with their current status
   */
  async getMemberPresenceList(): Promise<MemberPresenceItem[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string
        service_number: string
        employee_number: string | null
        first_name: string
        last_name: string
        initials: string | null
        rank: string
        division_id: string
        mess: string | null
        moc: string | null
        member_type: string
        account_level: number
        must_change_pin: boolean
        class_details: string | null
        status: string
        email: string | null
        home_phone: string | null
        mobile_phone: string | null
        badge_id: string | null
        member_created_at: Date
        member_updated_at: Date
        division_name: string
        division_code: string
        division_description: string | null
        division_created_at: Date
        division_updated_at: Date
        checkin_id: string | null
        checkin_member_id: string | null
        checkin_badge_id: string | null
        direction: string | null
        timestamp: Date | null
        kiosk_id: string | null
        synced: boolean | null
        checkin_created_at: Date | null
        checkin_method: string | null
        checkin_created_by_admin: string | null
      }>
    >`
      SELECT
        m.id, m.service_number, m.employee_number, m.first_name, m.last_name, m.initials, m.rank,
        m.division_id, m.mess, m.moc, m.member_type, m.account_level, m.must_change_pin, m.class_details, m.status, m.email, m.home_phone, m.mobile_phone,
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
    `

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
        memberType: row.member_type as unknown as MemberType,
        accountLevel: row.account_level,
        mustChangePin: row.must_change_pin,
        classDetails: row.class_details ?? undefined,
        status: row.status as unknown as MemberStatus,
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
      }

      let lastCheckin: Checkin | undefined
      if (
        row.checkin_id &&
        row.checkin_member_id &&
        row.checkin_badge_id &&
        row.timestamp &&
        row.kiosk_id !== null
      ) {
        const checkinMethod = row.checkin_method === 'admin_manual' ? 'admin_manual' : 'badge'
        const checkinSynced = row.synced === false ? false : true
        const checkinCreatedAt = row.checkin_created_at ? row.checkin_created_at : row.timestamp

        lastCheckin = {
          id: row.checkin_id,
          memberId: row.checkin_member_id,
          badgeId: row.checkin_badge_id,
          direction: (row.direction?.toLowerCase() ?? 'out') as 'in' | 'out',
          timestamp: row.timestamp,
          kioskId: row.kiosk_id,
          synced: checkinSynced,
          method: checkinMethod,
          createdByAdmin: row.checkin_created_by_admin ? row.checkin_created_by_admin : undefined,
          createdAt: checkinCreatedAt,
        }
      }

      const status: 'present' | 'absent' = row.direction === 'in' ? 'present' : 'absent'

      return {
        member,
        status,
        lastCheckin,
      }
    })
  }

  /**
   * Invalidate presence cache in Redis
   * TODO: Implement when Redis infrastructure is ready
   */
  private async invalidatePresenceCache(): Promise<void> {
    // await redis.del(this.PRESENCE_CACHE_KEY);
  }

  /**
   * Get recent activity (checkins + visitors) for display
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivityItem[]> {
    // Calculate the operational day cutoff (3am today in local timezone)
    // Activity before this cutoff belongs to a previous operational day
    const now = DateTime.now().setZone(DEFAULT_TIMEZONE)
    const cutoff =
      now.hour < OPERATIONAL_DAY_START_HOUR
        ? now
            .minus({ days: 1 })
            .set({ hour: OPERATIONAL_DAY_START_HOUR, minute: 0, second: 0, millisecond: 0 })
        : now.set({ hour: OPERATIONAL_DAY_START_HOUR, minute: 0, second: 0, millisecond: 0 })
    const cutoffDate = cutoff.toJSDate()

    // Use raw query for UNION (not supported in Prisma)
    const rows = await this.prisma.$queryRaw<
      Array<{
        type: string
        id: string
        timestamp: Date
        direction: string
        name: string
        rank: string | null
        division: string | null
        kiosk_id: string | null
        organization: string | null
        visit_type: string | null
        visit_reason: string | null
        host_name: string | null
        event_id: string | null
        event_name: string | null
      }>
    >`
      (
        SELECT
          'checkin' as type,
          c.id,
          c.timestamp,
          c.direction,
          COALESCE(NULLIF(m.display_name, ''), m.first_name || ' ' || m.last_name) as name,
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
        WHERE c.timestamp >= ${cutoffDate}
        ORDER BY c.timestamp DESC
        LIMIT ${limit}
      )
      UNION ALL
      (
        SELECT
          'visitor' as type,
          v.id,
          v.check_in_time as timestamp,
          'in' as direction,
          COALESCE(NULLIF(v.display_name, ''), v.name),
          NULL as rank,
          NULL as division,
          v.kiosk_id,
          v.organization,
          v.visit_type,
          v.visit_reason,
          CASE WHEN hm.id IS NOT NULL THEN COALESCE(NULLIF(hm.display_name, ''), hm.first_name || ' ' || hm.last_name) ELSE NULL END as host_name,
          v.event_id,
          e.name as event_name
        FROM visitors v
        LEFT JOIN members hm ON v.host_member_id = hm.id
        LEFT JOIN events e ON v.event_id = e.id
        WHERE v.check_in_time >= ${cutoffDate}
        ORDER BY v.check_in_time DESC
        LIMIT ${limit}
      )
      UNION ALL
      (
        SELECT
          'visitor' as type,
          v.id,
          v.check_out_time as timestamp,
          'out' as direction,
          COALESCE(NULLIF(v.display_name, ''), v.name),
          NULL as rank,
          NULL as division,
          v.kiosk_id,
          v.organization,
          v.visit_type,
          v.visit_reason,
          CASE WHEN hm.id IS NOT NULL THEN COALESCE(NULLIF(hm.display_name, ''), hm.first_name || ' ' || hm.last_name) ELSE NULL END as host_name,
          v.event_id,
          e.name as event_name
        FROM visitors v
        LEFT JOIN members hm ON v.host_member_id = hm.id
        LEFT JOIN events e ON v.event_id = e.id
        WHERE v.check_out_time IS NOT NULL
          AND v.check_out_time >= ${cutoffDate}
        ORDER BY v.check_out_time DESC
        LIMIT ${limit}
      )
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `

    return rows.map((row) => ({
      type: row.type as 'checkin' | 'visitor',
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      direction: row.direction as 'in' | 'out',
      name: row.name,
      rank: row.rank ?? undefined,
      division: row.division ?? undefined,
      kioskId: row.kiosk_id ?? undefined,
      // TODO: Implement getKioskName utility
      kioskName: row.kiosk_id ?? undefined,
      organization: row.organization ?? undefined,
      visitType: row.visit_type ?? undefined,
      visitReason: row.visit_reason ?? undefined,
      hostName: row.host_name ?? undefined,
      eventId: row.event_id ?? undefined,
      eventName: row.event_name ?? undefined,
    }))
  }
}

interface RecentActivityItem {
  type: 'checkin' | 'visitor'
  id: string
  timestamp: string
  direction: 'in' | 'out'
  name: string
  // Member fields
  rank?: string
  division?: string
  // Location
  kioskId?: string
  kioskName?: string
  // Visitor fields
  organization?: string
  visitType?: string
  visitReason?: string
  hostName?: string
  // Event context
  eventId?: string
  eventName?: string
}

export const checkinRepository = new CheckinRepository()
