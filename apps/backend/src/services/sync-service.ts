import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { MemberRepository } from '../repositories/member-repository.js'
import type { CheckinDirection, Badge, MemberWithDivision } from '@sentinel/types'
import { serviceLogger } from '../lib/logger.js'

// TODO Phase 3: Implement timestamp validator
// import { validateCheckinTimestamp } from '../utils/timestamp-validator.js'

// TODO Phase 3: Implement kiosk name lookup
// import { getKioskName } from '../utils/kiosk-names.js'

// TODO Phase 3: Implement WebSocket broadcasting
// import { broadcastCheckin, broadcastPresenceUpdate } from '../websocket/index.js'

export interface BulkCheckinInput {
  serialNumber: string
  timestamp: string
  kioskId?: string
  localTimestamp?: number
  sequenceNumber?: number
}

export interface BulkCheckinSuccess {
  serialNumber: string
  timestamp: string
  success: true
  checkinId: string
  memberId: string
  memberName: string
  direction: CheckinDirection
}

export interface BulkCheckinError {
  serialNumber: string
  timestamp: string
  success: false
  error: string
}

export type BulkCheckinItemResult = BulkCheckinSuccess | BulkCheckinError

export interface BulkCheckinResult {
  success: boolean
  processed: number
  failed: number
  results: BulkCheckinItemResult[]
}

interface CheckinItem {
  serialNumber: string
  timestamp: Date
  kioskId: string
  originalTimestampStr: string
  localTimestamp?: number
  sequenceNumber?: number
  flaggedForReview: boolean
  flagReason?: string
}

/**
 * Validate clock drift and flag suspicious timestamps
 */
function validateClockDrift(
  localTimestamp: number | undefined,
  serverTime: Date
): { flagged: boolean; reason?: string } {
  if (!localTimestamp) {
    return { flagged: false }
  }

  const drift = Math.abs(serverTime.getTime() - localTimestamp)
  const MAX_DRIFT = 5 * 60 * 1000 // 5 minutes

  if (drift > MAX_DRIFT) {
    const driftMinutes = Math.floor(drift / 60000)
    return {
      flagged: true,
      reason: `Clock drift: ${driftMinutes} minute(s)`,
    }
  }

  return { flagged: false }
}

/**
 * Service for processing bulk check-ins from offline kiosks
 * Handles validation, deduplication, clock drift detection, and batch processing
 */
export class SyncService {
  private checkinRepo: CheckinRepository
  private badgeRepo: BadgeRepository
  private memberRepo: MemberRepository

  constructor(prismaClient?: PrismaClient) {
    const prisma = prismaClient || getPrismaClient()
    this.checkinRepo = new CheckinRepository(prisma)
    this.badgeRepo = new BadgeRepository(prisma)
    this.memberRepo = new MemberRepository(prisma)
  }

  /**
   * Process bulk check-ins with validation, deduplication, and error handling
   */
  async processBulkCheckins(checkins: BulkCheckinInput[]): Promise<BulkCheckinResult> {
    const results: BulkCheckinItemResult[] = []
    const validatedCheckins: CheckinItem[] = []
    const errorMap = new Map<number, string>()
    const serverTime = new Date()

    // Step 1: Validate all timestamps and detect clock drift
    for (let i = 0; i < checkins.length; i++) {
      const checkin = checkins[i]
      if (!checkin) continue
      const timestamp = new Date(checkin.timestamp)

      // TODO Phase 3: Use timestamp validator
      // const validation = validateCheckinTimestamp(timestamp)
      // if (!validation.valid) {
      //   errorMap.set(i, validation.reason ?? 'Invalid timestamp')
      //   continue
      // }

      // Check for clock drift
      const driftCheck = validateClockDrift(checkin.localTimestamp, serverTime)

      validatedCheckins.push({
        serialNumber: checkin.serialNumber,
        timestamp,
        kioskId: checkin.kioskId ?? '',
        originalTimestampStr: checkin.timestamp,
        localTimestamp: checkin.localTimestamp,
        sequenceNumber: checkin.sequenceNumber ?? 0,
        flaggedForReview: driftCheck.flagged,
        flagReason: driftCheck.reason,
      })
    }

    // Step 2: Sort by timestamp (oldest first)
    validatedCheckins.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Step 3: Deduplicate - same badge + same kiosk within 5 seconds = keep earliest only
    const deduplicatedCheckins: CheckinItem[] = []
    const DEDUP_WINDOW_MS = 5000

    for (let i = 0; i < validatedCheckins.length; i++) {
      const current = validatedCheckins[i]
      if (!current) continue
      const dupKey = `${current.serialNumber}:${current.kioskId}`

      // Check if this is a duplicate of a recently seen scan
      let isDuplicate = false
      for (let j = i - 1; j >= 0 && !isDuplicate; j--) {
        const prev = validatedCheckins[j]
        if (!prev) continue
        const prevDupKey = `${prev.serialNumber}:${prev.kioskId}`

        if (
          prevDupKey === dupKey &&
          current.timestamp.getTime() - prev.timestamp.getTime() < DEDUP_WINDOW_MS
        ) {
          isDuplicate = true
        }
      }

      if (!isDuplicate) {
        deduplicatedCheckins.push(current)
      }
    }

    // Step 4: Batch load all required data upfront
    const serialNumbers = deduplicatedCheckins.map((c) => c.serialNumber)

    // Load all badges in one query
    const badges = await this.badgeRepo.findBySerialNumbers(serialNumbers)
    const badgeMap = new Map<string, Badge>()
    badges.forEach((badge) => {
      badgeMap.set(badge.serialNumber, badge)
    })

    // Extract member IDs from badges
    const memberIds = badges
      .filter((b) => b.assignmentType === 'member' && b.assignedToId)
      .map((b) => b.assignedToId as string)

    // Load all members in one query
    const members = await this.memberRepo.findByIds(memberIds)
    const memberMap = new Map<string, MemberWithDivision>()
    members.forEach((member) => {
      memberMap.set(member.id, member)
    })

    // Load all latest checkins in one query
    const latestCheckinsMap = await this.checkinRepo.findLatestByMembers(memberIds)

    // Step 5: Process valid, deduplicated checkins with batch-loaded data
    for (const checkinItem of deduplicatedCheckins) {
      try {
        const { serialNumber, timestamp, originalTimestampStr } = checkinItem

        // Look up badge from batch-loaded data
        const badge = badgeMap.get(serialNumber)
        if (!badge || badge.assignmentType !== 'member' || !badge.assignedToId) {
          results.push({
            serialNumber,
            timestamp: originalTimestampStr,
            success: false,
            error: 'Badge not found or not assigned',
          })
          continue
        }

        const memberId = badge.assignedToId

        // Check badge status
        if (badge.status !== 'active') {
          results.push({
            serialNumber,
            timestamp: originalTimestampStr,
            success: false,
            error: `Badge is ${badge.status}`,
          })
          continue
        }

        // Get last checkin from batch-loaded data
        const lastCheckin = latestCheckinsMap.get(memberId)
        const direction: CheckinDirection = lastCheckin?.direction === 'in' ? 'out' : 'in'

        // Create checkin record with flagging if clock drift detected
        const checkin = await this.checkinRepo.create({
          memberId,
          badgeId: badge.id,
          direction,
          timestamp,
          kioskId: checkinItem.kioskId,
          synced: true,
          flaggedForReview: checkinItem.flaggedForReview,
          flagReason: checkinItem.flagReason,
        })

        // Get member info from batch-loaded data
        const member = memberMap.get(memberId)

        // TODO Phase 3: Broadcast checkin event
        // if (member && checkinItem.kioskId) {
        //   broadcastCheckin({
        //     memberId: member.id,
        //     memberName: `${member.firstName} ${member.lastName}`,
        //     rank: member.rank,
        //     division: member.division.name,
        //     direction,
        //     timestamp: timestamp.toISOString(),
        //     kioskId: checkinItem.kioskId,
        //     kioskName: getKioskName(checkinItem.kioskId),
        //   })
        // }

        results.push({
          serialNumber,
          timestamp: originalTimestampStr,
          success: true,
          checkinId: checkin.id,
          memberId,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
          direction,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          serialNumber: checkinItem.serialNumber,
          timestamp: checkinItem.originalTimestampStr,
          success: false,
          error: errorMessage,
        })
      }
    }

    // TODO Phase 3: Broadcast updated presence stats after processing
    // const successCount = results.filter((r) => r.success).length
    // if (successCount > 0) {
    //   const stats = await this.checkinRepo.getPresenceStats()
    //   broadcastPresenceUpdate(stats)
    // }

    // Log flagged items for admin review
    const flaggedItems = deduplicatedCheckins.filter((item) => item.flaggedForReview)
    if (flaggedItems.length > 0) {
      serviceLogger.warn('Bulk sync has flagged items', {
        kioskId: flaggedItems[0]?.kioskId,
        flaggedCount: flaggedItems.length,
      })
    }

    // Add errors from timestamp validation
    for (const [originalIndex, errorReason] of errorMap.entries()) {
      const checkin = checkins[originalIndex]
      if (!checkin) continue
      results.push({
        serialNumber: checkin.serialNumber,
        timestamp: checkin.timestamp,
        success: false,
        error: errorReason,
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    return {
      success: failedCount === 0,
      processed: successCount,
      failed: failedCount,
      results,
    }
  }
}

export const syncService = new SyncService()
