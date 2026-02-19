import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { PresenceService } from './presence-service.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'
import type { Checkin, CheckinDirection, MemberWithDivision } from '@sentinel/types'

// TODO Phase 3: Implement security alert service
// import { SecurityAlertService } from './security-alert-service.js'

// TODO Phase 3: Implement timestamp validator
// import { validateCheckinTimestamp } from '../utils/timestamp-validator.js'

// TODO Phase 3: Implement kiosk name lookup
// import { getKioskName } from '../utils/kiosk-names.js'

import { broadcastCheckin } from '../websocket/broadcast.js'
import { serviceLogger } from '../lib/logger.js'

interface CheckinOptions {
  timestamp?: Date
  kioskId?: string
}

interface CheckinWarning {
  type: 'inactive_member'
  message: string
}

interface CheckinResult {
  checkin: Checkin
  member: MemberWithDivision
  direction: CheckinDirection
  warning?: CheckinWarning
}

export class CheckinService {
  private checkinRepo: CheckinRepository
  private badgeRepo: BadgeRepository
  private memberRepo: MemberRepository
  private presenceService: PresenceService

  constructor(prismaClient?: PrismaClient) {
    const prisma = prismaClient || getPrismaClient()
    this.checkinRepo = new CheckinRepository(prisma)
    this.badgeRepo = new BadgeRepository(prisma)
    this.memberRepo = new MemberRepository(prisma)
    this.presenceService = new PresenceService(prisma)
  }

  /**
   * Process a badge scan and create a checkin record
   * Handles badge validation, direction determination, duplicate detection, and broadcasting
   */
  async processCheckin(serialNumber: string, options: CheckinOptions): Promise<CheckinResult> {
    const scanTimestamp = options.timestamp ?? new Date()

    // TODO Phase 3: Validate timestamp if provided
    // if (options.timestamp) {
    //   const timestampValidation = validateCheckinTimestamp(scanTimestamp)
    //   if (!timestampValidation.valid) {
    //     throw new ValidationError(timestampValidation.reason ?? 'Invalid timestamp')
    //   }
    // }

    // Look up badge by serial number with joined member data (single query)
    const badgeWithMember = await this.badgeRepo.findBySerialNumberWithMember(serialNumber)
    if (!badgeWithMember) {
      // TODO Phase 3: Create security alert for unknown badge
      // if (options.kioskId) {
      //   await securityAlertService.createAlert({
      //     alertType: 'badge_unknown',
      //     severity: 'warning',
      //     badgeSerial: serialNumber,
      //     kioskId: options.kioskId,
      //     message: `Unknown badge scanned: ${serialNumber}`,
      //   })
      // }
      throw new NotFoundError('Badge', serialNumber)
    }

    const { badge, member } = badgeWithMember

    // Check if badge is assigned
    if (badge.assignmentType === 'unassigned' || !badge.assignedToId) {
      throw new ValidationError(`Badge ${serialNumber} is not assigned to any member`)
    }

    // Check badge status
    if (badge.status !== 'active') {
      // TODO Phase 3: Create security alert for disabled/inactive badge
      // if (options.kioskId) {
      //   await securityAlertService.createAlert({
      //     alertType: 'badge_disabled',
      //     severity: 'critical',
      //     badgeSerial: serialNumber,
      //     memberId: member?.id,
      //     kioskId: options.kioskId,
      //     message: `Disabled badge scanned: ${serialNumber} (status: ${badge.status})`,
      //   })
      // }
      throw new ValidationError(`Badge ${serialNumber} is ${badge.status}`)
    }

    // Only support member badges for now (not event attendees)
    if (badge.assignmentType !== 'member') {
      throw new ValidationError(`Badge type ${badge.assignmentType} not supported for check-in`)
    }

    const memberId = badge.assignedToId

    // Validate member was loaded
    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Check member status - allow check-in but flag warning for inactive members
    let memberWarning: CheckinWarning | undefined
    if (member.status === 'inactive') {
      // TODO Phase 3: Create security alert for inactive member
      // if (options.kioskId) {
      //   await securityAlertService.createAlert({
      //     alertType: 'inactive_member',
      //     severity: 'warning',
      //     badgeSerial: serialNumber,
      //     memberId: member.id,
      //     kioskId: options.kioskId,
      //     message: `Inactive member checked in: ${member.rank} ${member.firstName} ${member.lastName}`,
      //   })
      // }
      memberWarning = {
        type: 'inactive_member',
        message: 'This member is marked as inactive in the system.',
      }
    }

    // Get direction from Redis cache first, fall back to DB if cache miss
    let lastDirection = await this.presenceService.getMemberDirection(memberId)
    if (!lastDirection) {
      // Cache miss - query DB for last checkin
      const lastCheckin = await this.checkinRepo.findLatestByMember(memberId)
      lastDirection = (lastCheckin?.direction as CheckinDirection) ?? null
    }

    const direction: CheckinDirection = lastDirection === 'in' ? 'out' : 'in'

    // Check for duplicate scans within 2 seconds (DB safety net)
    if (await this.isDuplicateScan(memberId, scanTimestamp)) {
      throw new ConflictError('Duplicate scan within 2 seconds')
    }

    // Create checkin record
    const checkin = await this.checkinRepo.create({
      memberId,
      badgeId: badge.id,
      direction,
      timestamp: scanTimestamp,
      kioskId: options.kioskId || 'unknown', // Default to 'unknown' if not provided
      synced: true,
    })

    // Cache the new direction in Redis for next checkin
    await this.presenceService.setMemberDirection(memberId, direction)

    // Broadcast checkin event to WebSocket clients
    if (options.kioskId) {
      broadcastCheckin({
        id: checkin.id,
        memberId: member.id,
        memberName: member.displayName ?? `${member.firstName} ${member.lastName}`,
        rank: member.rank,
        division: member.division?.name ?? 'Unknown',
        direction,
        timestamp: scanTimestamp.toISOString(),
        kioskId: options.kioskId,
      })
    }

    serviceLogger.info(`Check-${direction} ${member.rank} ${member.lastName}`, {
      memberId,
      direction,
      badgeSerial: serialNumber,
      kioskId: options.kioskId,
    })

    return {
      checkin,
      member,
      direction,
      warning: memberWarning,
    }
  }

  /**
   * Check if a scan is a duplicate (within 2 seconds of last checkin)
   * Must match kiosk successDisplayMs to prevent "ready but rejected" state
   */
  async isDuplicateScan(memberId: string, timestamp: Date): Promise<boolean> {
    const lastCheckin = await this.checkinRepo.findLatestByMember(memberId)

    if (!lastCheckin) {
      return false
    }

    const timeDiff = timestamp.getTime() - lastCheckin.timestamp.getTime()
    return Math.abs(timeDiff) < 2000
  }

  /**
   * Admin force checkout - Manually check out a member
   * Used when members forget to badge out
   */
  async adminCheckout(memberId: string): Promise<CheckinResult> {
    // Get member with division
    const member = await this.memberRepo.findById(memberId)
    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Get member's badge
    if (!member.badgeId) {
      throw new ValidationError(`Member ${memberId} does not have a badge assigned`)
    }

    // Verify member is currently checked in
    const lastDirection = await this.presenceService.getMemberDirection(memberId)
    if (lastDirection !== 'in') {
      const lastCheckin = await this.checkinRepo.findLatestByMember(memberId)
      const actualDirection = lastCheckin?.direction ?? null

      if (actualDirection !== 'in') {
        throw new ValidationError(`Member ${memberId} is not currently checked in`)
      }
    }

    const checkoutTimestamp = new Date()

    // Create checkout checkin record
    const checkin = await this.checkinRepo.create({
      memberId,
      badgeId: member.badgeId,
      direction: 'out',
      timestamp: checkoutTimestamp,
      kioskId: 'admin-forced-checkout',
      synced: true,
    })

    // Update member direction cache
    await this.presenceService.setMemberDirection(memberId, 'out')

    // Broadcast checkin event to activity feed
    broadcastCheckin({
      id: checkin.id,
      memberId: member.id,
      memberName: member.displayName ?? `${member.firstName} ${member.lastName}`,
      rank: member.rank,
      division: member.division?.name ?? 'Unknown',
      direction: 'out',
      timestamp: checkoutTimestamp.toISOString(),
      kioskId: 'admin-forced-checkout',
    })

    serviceLogger.info(`Admin force checkout ${member.rank} ${member.lastName}`, {
      memberId,
    })

    return {
      checkin,
      member,
      direction: 'out',
    }
  }
}

export const checkinService = new CheckinService()
