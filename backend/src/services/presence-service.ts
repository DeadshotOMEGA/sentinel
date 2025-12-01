import { checkinRepository } from '../db/repositories/checkin-repository';
import { redis } from '../db/redis';
import { broadcastPresenceUpdate } from '../websocket/broadcast';
import { logger } from '../utils/logger';
import type {
  PresenceStats,
  CheckinDirection,
} from '../../../shared/types';

interface PresentMember {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  division: string;
  mess: string | null;
  checkedInAt: string;
}

interface MemberPresenceItem {
  member: {
    id: string;
    serviceNumber: string;
    employeeNumber?: string;
    firstName: string;
    lastName: string;
    initials?: string;
    rank: string;
    divisionId: string;
    mess?: string;
    moc?: string;
    memberType: 'class_a' | 'class_b' | 'class_c' | 'reg_force';
    classDetails?: string;
    status: 'active' | 'inactive' | 'pending_review';
    email?: string;
    homePhone?: string;
    mobilePhone?: string;
    badgeId?: string;
    createdAt: Date;
    updatedAt: Date;
    division: {
      id: string;
      name: string;
      code: string;
      description?: string;
      createdAt: Date;
      updatedAt: Date;
    };
  };
  status: 'present' | 'absent';
  lastCheckin?: {
    id: string;
    memberId: string;
    badgeId: string;
    direction: 'in' | 'out';
    timestamp: Date;
    kioskId?: string;
    synced: boolean;
    createdAt: Date;
  };
}

interface RecentActivityItem {
  type: 'checkin' | 'visitor';
  id: string;
  timestamp: string;
  direction?: 'in' | 'out';
  name: string;
  rank?: string;
  division?: string;
  organization?: string;
}

/**
 * Service for real-time presence aggregation and broadcasting
 *
 * Responsibilities:
 * - Aggregate presence data from repository
 * - Broadcast real-time presence updates via WebSocket
 * - Cache member direction state in Redis (for ARCH-01 N+1 fix)
 * - Coordinate cache invalidation
 */
export class PresenceService {
  private readonly MEMBER_DIRECTION_KEY_PREFIX = 'member:direction:';
  private readonly DIRECTION_CACHE_TTL = 86400; // 24 hours

  /**
   * Get current presence statistics
   * Delegates to repository which handles caching
   */
  async getStats(): Promise<PresenceStats> {
    return await checkinRepository.getPresenceStats();
  }

  /**
   * Get list of currently present members
   */
  async getPresentMembers(): Promise<PresentMember[]> {
    return await checkinRepository.getPresentMembers();
  }

  /**
   * Get all members with their presence status
   */
  async getMemberPresenceList(): Promise<MemberPresenceItem[]> {
    return await checkinRepository.getMemberPresenceList();
  }

  /**
   * Get recent check-in/visitor activity
   * @param limit Maximum number of items to return (default: 10)
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivityItem[]> {
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    return await checkinRepository.getRecentActivity(limit);
  }

  /**
   * Broadcast updated presence statistics to all WebSocket clients
   * Fetches latest stats and broadcasts them via WebSocket
   */
  async broadcastStatsUpdate(): Promise<void> {
    const stats = await this.getStats();
    broadcastPresenceUpdate(stats);
    logger.info('Presence stats broadcast', { stats });
  }

  /**
   * Invalidate presence cache
   * Forces fresh calculation on next stats request
   */
  async invalidateCache(): Promise<void> {
    // Cache invalidation is handled internally by the repository
    // This method exists for explicit admin-triggered invalidation
    await redis.del('presence:stats');
    logger.info('Presence cache invalidated');
  }

  /**
   * Get member's last known direction from Redis cache
   * Prepares for ARCH-01 N+1 optimization in Phase 3
   *
   * @param memberId - The member's UUID
   * @returns The last known direction ('in' or 'out'), or null if not cached
   */
  async getMemberDirection(memberId: string): Promise<CheckinDirection | null> {
    const key = `${this.MEMBER_DIRECTION_KEY_PREFIX}${memberId}`;
    const direction = await redis.get(key);

    if (!direction) {
      return null;
    }

    if (direction !== 'in' && direction !== 'out') {
      logger.warn('Invalid direction in cache', { memberId, direction });
      return null;
    }

    return direction as CheckinDirection;
  }

  /**
   * Set member's direction in Redis cache
   * Prepares for ARCH-01 N+1 optimization in Phase 3
   *
   * @param memberId - The member's UUID
   * @param direction - The direction to cache ('in' or 'out')
   */
  async setMemberDirection(memberId: string, direction: CheckinDirection): Promise<void> {
    const key = `${this.MEMBER_DIRECTION_KEY_PREFIX}${memberId}`;
    await redis.setex(key, this.DIRECTION_CACHE_TTL, direction);
    logger.debug('Member direction cached', { memberId, direction });
  }

  /**
   * Clear member's direction from cache
   * Used when direction becomes stale or during cache invalidation
   *
   * @param memberId - The member's UUID
   */
  async clearMemberDirection(memberId: string): Promise<void> {
    const key = `${this.MEMBER_DIRECTION_KEY_PREFIX}${memberId}`;
    await redis.del(key);
    logger.debug('Member direction cache cleared', { memberId });
  }
}

export const presenceService = new PresenceService();
