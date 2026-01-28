import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { VisitorRepository } from '../repositories/visitor-repository.js'
import type { CheckinDirection } from '@sentinel/types'

// TODO Phase 3: Add Redis caching
// TODO Phase 3: Add WebSocket broadcasting
// TODO Phase 3: Add alert system integration

interface PresenceStats {
  totalMembers: number
  presentMembers: number
  totalVisitors: number
  presentVisitors: number
}

interface PresentMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  division: string
  divisionId: string
  memberType: string
  mess: string | null
  checkedInAt: string
  kioskId?: string
  tags: Array<{ id: string; name: string; color: string }>
}

interface MemberPresenceItem {
  member: {
    id: string
    serviceNumber: string
    employeeNumber?: string
    firstName: string
    lastName: string
    initials?: string
    rank: string
    divisionId: string
    mess?: string
    moc?: string
    memberType: string
    classDetails?: string
    status: string
    email?: string
    homePhone?: string
    mobilePhone?: string
    badgeId?: string
    createdAt: Date
    updatedAt: Date
    division: {
      id: string
      name: string
      code: string
      description?: string
      createdAt: Date
      updatedAt: Date
    }
  }
  status: 'present' | 'absent'
  lastCheckin?: {
    id: string
    memberId: string
    badgeId: string
    direction: 'in' | 'out'
    timestamp: Date
    kioskId?: string
    synced: boolean
    createdAt: Date
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

interface PresentPerson {
  id: string
  type: 'member' | 'visitor'
  name: string
  rank?: string
  division?: string
  divisionId?: string
  memberType?: string
  tags?: Array<{ id: string; name: string; color: string }>
  organization?: string
  visitType?: string
  visitReason?: string
  hostMemberId?: string
  hostName?: string
  eventId?: string
  eventName?: string
  checkInTime: Date
  kioskId?: string
  kioskName?: string
  alerts?: Array<{ id: string; type: string; message: string }>
}

/**
 * Service for real-time presence aggregation and broadcasting
 *
 * Responsibilities:
 * - Aggregate presence data from repository
 * - Broadcast real-time presence updates via WebSocket (TODO Phase 3)
 * - Cache member direction state in Redis (TODO Phase 3)
 * - Coordinate cache invalidation
 */
export class PresenceService {
  private checkinRepo: CheckinRepository
  private visitorRepo: VisitorRepository

  constructor(prismaClient?: PrismaClient) {
    const prisma = prismaClient || getPrismaClient()
    this.checkinRepo = new CheckinRepository(prisma)
    this.visitorRepo = new VisitorRepository(prisma)
  }

  /**
   * Get current presence statistics
   * Delegates to repository which handles caching
   */
  async getStats(): Promise<PresenceStats> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await this.checkinRepo.getPresenceStats()) as any
  }

  /**
   * Get list of currently present members
   */
  async getPresentMembers(): Promise<PresentMember[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await this.checkinRepo.getPresentMembers()) as any
  }

  /**
   * Get all members with their presence status
   */
  async getMemberPresenceList(): Promise<MemberPresenceItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await this.checkinRepo.getMemberPresenceList()) as any
  }

  /**
   * Get recent check-in/visitor activity
   * @param limit Maximum number of items to return (default: 10)
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivityItem[]> {
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }
    return await this.checkinRepo.getRecentActivity(limit)
  }

  /**
   * Get all present people (members + visitors) for dashboard
   * Returns unified PresentPerson array with alerts
   */
  async getAllPresentPeople(): Promise<PresentPerson[]> {
    const [members, visitors] = await Promise.all([
      this.getPresentMembers(),
      this.visitorRepo.findActiveWithRelations(),
    ])

    const presentMembers: PresentPerson[] = members.map((m) => {
      // TODO Phase 3: Add alert system integration
      // const alerts = getAlertsForPerson('member', m.id)
      return {
        id: m.id,
        type: 'member' as const,
        name: `${m.firstName} ${m.lastName}`,
        rank: m.rank,
        division: m.division,
        divisionId: m.divisionId,
        memberType: m.memberType,
        tags: m.tags,
        checkInTime: new Date(m.checkedInAt),
        kioskId: m.kioskId,
        // TODO Phase 3: Add kiosk name lookup
        // kioskName: m.kioskId ? getKioskName(m.kioskId) : undefined,
        // alerts: alerts.length > 0 ? alerts : undefined,
      }
    })

    const presentVisitors: PresentPerson[] = visitors.map((v) => {
      // TODO Phase 3: Add alert system integration
      // const alerts = getAlertsForPerson('visitor', v.id)
      return {
        id: v.id,
        type: 'visitor' as const,
        name: v.name,
        organization: v.organization,
        visitType: v.visitType,
        visitReason: v.visitReason,
        hostMemberId: v.hostMemberId,
        hostName: v.hostName,
        eventId: v.eventId,
        eventName: v.eventName,
        checkInTime: v.checkInTime,
        kioskId: undefined, // Not tracked for visitors
        kioskName: undefined,
        // alerts: alerts.length > 0 ? alerts : undefined,
      }
    })

    return [...presentMembers, ...presentVisitors]
  }

  /**
   * Broadcast updated presence statistics to all WebSocket clients
   * Fetches latest stats and broadcasts them via WebSocket
   */
  async broadcastStatsUpdate(): Promise<void> {
    // TODO Phase 3: Implement WebSocket broadcasting
    // const stats = await this.getStats()
    // broadcastPresenceUpdate(stats)
    // logger.info('Presence stats broadcast', { stats })
    throw new Error('WebSocket broadcasting not yet implemented (Phase 3)')
  }

  /**
   * Invalidate presence cache
   * Forces fresh calculation on next stats request
   */
  async invalidateCache(): Promise<void> {
    // TODO Phase 3: Implement Redis caching
    // await redis.del('presence:stats')
    // logger.info('Presence cache invalidated')
    throw new Error('Redis caching not yet implemented (Phase 3)')
  }

  /**
   * Check if a member is currently present (checked in)
   */
  async isMemberPresent(memberId: string): Promise<boolean> {
    const presentMembers = await this.getPresentMembers()
    return presentMembers.some((m) => m.id === memberId)
  }

  /**
   * Get member's last known direction from Redis cache
   * Prepares for ARCH-01 N+1 optimization in Phase 3
   *
   * @param _memberId - The member's UUID
   * @returns The last known direction ('in' or 'out'), or null if not cached
   */
  async getMemberDirection(_memberId: string): Promise<CheckinDirection | null> {
    // TODO Phase 3: Implement Redis caching
    // const key = `${this._MEMBER_DIRECTION_KEY_PREFIX}${_memberId}`
    // const direction = await redis.get(key)
    // return direction as CheckinDirection | null
    return null
  }

  /**
   * Set member's direction in Redis cache
   * Prepares for ARCH-01 N+1 optimization in Phase 3
   *
   * @param _memberId - The member's UUID
   * @param _direction - The direction to cache ('in' or 'out')
   */
  async setMemberDirection(_memberId: string, _direction: CheckinDirection): Promise<void> {
    // TODO Phase 3: Implement Redis caching
    // const MEMBER_DIRECTION_KEY_PREFIX = 'member:direction:'
    // const DIRECTION_CACHE_TTL = 86400 // 24 hours
    // const key = `${MEMBER_DIRECTION_KEY_PREFIX}${_memberId}`
    // await redis.setex(key, DIRECTION_CACHE_TTL, _direction)
    // logger.debug('Member direction cached', { memberId: _memberId, direction: _direction })
  }

  /**
   * Clear member's direction from cache
   * Used when direction becomes stale or during cache invalidation
   *
   * @param _memberId - The member's UUID
   */
  async clearMemberDirection(_memberId: string): Promise<void> {
    // TODO Phase 3: Implement Redis caching
    // const MEMBER_DIRECTION_KEY_PREFIX = 'member:direction:'
    // const key = `${MEMBER_DIRECTION_KEY_PREFIX}${_memberId}`
    // await redis.del(key)
    // logger.debug('Member direction cache cleared', { memberId: _memberId })
  }
}

export const presenceService = new PresenceService()
