import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { VisitorRepository } from '../repositories/visitor-repository.js'
import { LockupRepository } from '../repositories/lockup-repository.js'
import type {
  LockupStatusEntity,
  LockupTransferEntity,
  LockupHolder,
} from '../repositories/lockup-repository.js'
import { QualificationService } from './qualification-service.js'
import { PresenceService } from './presence-service.js'
import { NotFoundError, ValidationError } from '../middleware/error-handler.js'
import { getOperationalDate } from '../utils/operational-date.js'
import { broadcastLockupExecution, broadcastLockupTransfer } from '../websocket/broadcast.js'
import { serviceLogger } from '../lib/logger.js'

// ============================================================================
// Types
// ============================================================================

interface LockupPresentData {
  members: Array<{
    id: string
    firstName: string
    lastName: string
    rank: string
    division: string
    divisionId: string | null
    memberType: 'class_a' | 'class_b' | 'class_c' | 'reg_force'
    mess: string | null
    checkedInAt: string
    kioskId?: string
  }>
  visitors: Array<{
    id: string
    name: string
    organization: string | undefined
    visitType: string
    checkInTime: Date
  }>
}

interface LockupExecutionResult {
  checkedOut: {
    members: string[]
    visitors: string[]
  }
  executionId: string
}

export interface CheckoutOptions {
  memberId: string
  holdsLockup: boolean
  canCheckout: boolean
  blockReason: string | null
  availableOptions: Array<'normal_checkout' | 'transfer_lockup' | 'execute_lockup'>
  eligibleRecipients?: Array<{
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
    qualifications: Array<{ code: string; name: string }>
  }>
}

export type TransferReason = 'manual' | 'dds_handoff' | 'duty_watch_takeover' | 'checkout_transfer'

interface LockupTransferHistoryItem {
  id: string
  type: 'transfer'
  fromMember: LockupHolder
  toMember: LockupHolder
  reason: string
  notes: string | null
  timestamp: string
}

interface LockupExecutionHistoryItem {
  id: string
  type: 'execution'
  executedBy: LockupHolder
  membersCheckedOut: number
  visitorsCheckedOut: number
  totalCheckedOut: number
  notes: string | null
  timestamp: string
}

type LockupHistoryItem = LockupTransferHistoryItem | LockupExecutionHistoryItem

// ============================================================================
// Service
// ============================================================================

/**
 * Service for managing lockup responsibility and building security
 *
 * The lockup system tracks who holds responsibility for securing the building
 * at the end of the day. Only qualified members can hold lockup responsibility.
 */
export class LockupService {
  private prisma: PrismaClient
  private checkinRepo: CheckinRepository
  private visitorRepo: VisitorRepository
  private lockupRepo: LockupRepository
  private qualificationService: QualificationService
  private presenceService: PresenceService

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
    this.checkinRepo = new CheckinRepository(this.prisma)
    this.visitorRepo = new VisitorRepository(this.prisma)
    this.lockupRepo = new LockupRepository(this.prisma)
    this.qualificationService = new QualificationService(this.prisma)
    this.presenceService = new PresenceService(this.prisma)
  }

  // ============================================================================
  // Status Methods
  // ============================================================================

  /**
   * Get current lockup status for today's operational date
   */
  async getCurrentStatus(): Promise<LockupStatusEntity> {
    const today = getOperationalDate()
    return this.lockupRepo.getOrCreateStatus(today)
  }

  /**
   * Get lockup status for a specific date (accepts YYYY-MM-DD string)
   */
  async getStatusByDate(date: string): Promise<LockupStatusEntity | null> {
    const parsedDate = new Date(date + 'T00:00:00')
    return this.lockupRepo.findStatusByDate(parsedDate)
  }

  /**
   * Check if a member currently holds lockup
   */
  async memberHoldsLockup(memberId: string): Promise<boolean> {
    const status = await this.getCurrentStatus()
    return status.currentHolderId === memberId
  }

  // ============================================================================
  // Transfer Methods
  // ============================================================================

  /**
   * Transfer lockup to another qualified member
   *
   * The fromMemberId is automatically determined from the current lockup holder.
   *
   * @throws ValidationError if transfer is not allowed
   * @throws NotFoundError if member not found
   */
  async transferLockup(
    toMemberId: string,
    reason: TransferReason,
    notes?: string | null
  ): Promise<{ transfer: LockupTransferEntity; newHolder: LockupHolder }> {
    // Get current status
    const status = await this.getCurrentStatus()

    // Verify someone currently holds lockup
    if (!status.currentHolderId) {
      throw new ValidationError('No active lockup holder to transfer from')
    }

    const fromMemberId = status.currentHolderId

    // Verify toMember exists
    const toMember = await this.prisma.member.findUnique({
      where: { id: toMemberId },
      select: { id: true, firstName: true, lastName: true, rank: true, serviceNumber: true },
    })

    if (!toMember) {
      throw new NotFoundError('Member', toMemberId)
    }

    // Verify toMember has lockup-eligible qualification
    const canReceive = await this.qualificationService.canMemberReceiveLockup(toMemberId)
    if (!canReceive) {
      throw new ValidationError('Recipient is not qualified to receive lockup responsibility')
    }

    // Verify toMember is checked in
    const isCheckedIn = await this.presenceService.isMemberPresent(toMemberId)
    if (!isCheckedIn) {
      throw new ValidationError('Recipient must be checked in to receive lockup responsibility')
    }

    // Create transfer record
    const transfer = await this.lockupRepo.createTransfer({
      lockupStatusId: status.id,
      fromMemberId,
      toMemberId,
      reason,
      notes,
    })

    // Update status with new holder
    await this.lockupRepo.updateHolder(status.id, toMemberId)

    // Broadcast transfer event
    broadcastLockupTransfer({
      transferId: transfer.id,
      fromMemberId,
      fromMemberName: `${transfer.fromMember.firstName} ${transfer.fromMember.lastName}`,
      toMemberId,
      toMemberName: `${transfer.toMember.firstName} ${transfer.toMember.lastName}`,
      reason,
      timestamp: transfer.transferredAt.toISOString(),
    })

    return {
      transfer,
      newHolder: toMember,
    }
  }

  /**
   * Acquire lockup when no one currently holds it
   *
   * @throws ValidationError if lockup already held or member not qualified
   * @throws NotFoundError if member not found
   */
  async acquireLockup(memberId: string, notes?: string): Promise<LockupStatusEntity> {
    const status = await this.getCurrentStatus()

    // Check if someone already holds lockup
    if (status.currentHolderId) {
      throw new ValidationError('Lockup is already held by another member')
    }

    // Verify member exists
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Verify member has lockup-eligible qualification
    const canReceive = await this.qualificationService.canMemberReceiveLockup(memberId)
    if (!canReceive) {
      throw new ValidationError('Member is not qualified to acquire lockup responsibility')
    }

    // Verify member is checked in
    const isCheckedIn = await this.presenceService.isMemberPresent(memberId)
    if (!isCheckedIn) {
      throw new ValidationError('Member must be checked in to acquire lockup responsibility')
    }

    // Update status with new holder
    const updatedStatus = await this.lockupRepo.updateHolder(status.id, memberId)

    // Create audit record if notes provided
    if (notes) {
      await this.prisma.responsibilityAuditLog.create({
        data: {
          memberId,
          tagName: 'Lockup',
          action: 'acquired',
          performedBy: memberId,
          performedByType: 'member',
          notes,
        },
      })
    }

    return updatedStatus
  }

  // ============================================================================
  // Checkout Options Methods
  // ============================================================================

  /**
   * Get checkout options for a member
   *
   * Returns what actions are available when the member attempts to checkout
   */
  async getCheckoutOptions(memberId: string): Promise<CheckoutOptions> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    const status = await this.getCurrentStatus()
    const holdsLockup = status.currentHolderId === memberId

    // If member doesn't hold lockup, normal checkout
    if (!holdsLockup) {
      return {
        memberId,
        holdsLockup: false,
        canCheckout: true,
        blockReason: null,
        availableOptions: ['normal_checkout'],
      }
    }

    // Member holds lockup - get eligible recipients
    const eligibleMembers = await this.qualificationService.getLockupEligibleMembers(true)

    // Filter out the current holder
    const eligibleRecipients = eligibleMembers
      .filter((m) => m.id !== memberId)
      .map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        rank: m.rank,
        serviceNumber: m.serviceNumber,
        qualifications: m.qualifications,
      }))

    // Determine available options
    const options: Array<'normal_checkout' | 'transfer_lockup' | 'execute_lockup'> = []

    // Can always execute lockup if holding it
    options.push('execute_lockup')

    // Can transfer if there are eligible recipients
    if (eligibleRecipients.length > 0) {
      options.push('transfer_lockup')
    }

    return {
      memberId,
      holdsLockup: true,
      canCheckout: false, // Cannot do normal checkout while holding lockup
      blockReason: 'You must transfer or execute lockup before checking out',
      availableOptions: options,
      eligibleRecipients,
    }
  }

  // ============================================================================
  // History Methods
  // ============================================================================

  /**
   * Get lockup history (transfers and executions)
   */
  async getHistory(
    startDateStr?: string,
    endDateStr?: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: LockupHistoryItem[]; total: number; hasMore: boolean }> {
    // Parse dates if provided
    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // Get transfers and executions
    const [transfers, executions, transferCount, executionCount] = await Promise.all([
      startDate && endDate
        ? this.lockupRepo.findTransfersByDateRange(startDate, endDate, limit * 2, 0)
        : this.lockupRepo.findRecentTransfers(limit * 2, 0),
      startDate && endDate
        ? this.lockupRepo.findExecutionsByDateRange(startDate, endDate, limit * 2, 0)
        : this.lockupRepo.findRecentExecutions(limit * 2, 0),
      this.lockupRepo.countTransfers(startDate, endDate),
      this.lockupRepo.countExecutions(startDate, endDate),
    ])

    // Convert to typed history items with string timestamps
    const transferItems: Array<LockupHistoryItem & { _ts: Date }> = transfers.map((t) => ({
      id: t.id,
      type: 'transfer' as const,
      fromMember: t.fromMember,
      toMember: t.toMember,
      reason: t.reason,
      notes: t.notes,
      timestamp: t.transferredAt.toISOString(),
      _ts: t.transferredAt,
    }))

    const executionItems: Array<LockupHistoryItem & { _ts: Date }> = executions.map((e) => ({
      id: e.id,
      type: 'execution' as const,
      executedBy: e.executedByMember,
      membersCheckedOut: Array.isArray(e.membersCheckedOut)
        ? (e.membersCheckedOut as unknown[]).length
        : 0,
      visitorsCheckedOut: Array.isArray(e.visitorsCheckedOut)
        ? (e.visitorsCheckedOut as unknown[]).length
        : 0,
      totalCheckedOut: e.totalCheckedOut,
      notes: e.notes,
      timestamp: e.executedAt.toISOString(),
      _ts: e.executedAt,
    }))

    // Merge and sort by timestamp descending
    const allItems = [...transferItems, ...executionItems]
    allItems.sort((a, b) => b._ts.getTime() - a._ts.getTime())

    // Apply pagination and remove internal _ts field
    const paginatedItems = allItems.slice(offset, offset + limit).map(({ _ts, ...item }) => item)
    const total = transferCount + executionCount

    return {
      items: paginatedItems,
      total,
      hasMore: offset + paginatedItems.length < total,
    }
  }

  // ============================================================================
  // Legacy Methods (kept for backwards compatibility)
  // ============================================================================

  /**
   * Check if a member is authorized to perform lockup
   *
   * Now uses qualification system instead of Tag system
   */
  async checkMemberHasLockupAuth(memberId: string): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Check if member currently holds lockup
    const holdsLockup = await this.memberHoldsLockup(memberId)
    if (holdsLockup) {
      return true
    }

    // Check if member has lockup-eligible qualification
    return this.qualificationService.canMemberReceiveLockup(memberId)
  }

  /**
   * @deprecated Use checkMemberHasLockupAuth instead
   */
  async checkMemberHasLockupTag(memberId: string): Promise<boolean> {
    return this.checkMemberHasLockupAuth(memberId)
  }

  /**
   * Get all currently present members and visitors for lockup confirmation screen
   */
  async getPresentMembersForLockup(): Promise<LockupPresentData> {
    const [members, visitors] = await Promise.all([
      this.checkinRepo.getPresentMembers(),
      this.visitorRepo.findActive(),
    ])

    return {
      members,
      visitors: visitors.map((v) => ({
        id: v.id,
        name: v.name,
        organization: v.organization,
        visitType: v.visitType,
        checkInTime: v.checkInTime,
      })),
    }
  }

  /**
   * Execute building lockup - bulk checkout all present members and visitors
   *
   * @throws ValidationError if member doesn't hold lockup
   * @throws NotFoundError if member not found
   */
  async executeLockup(performedById: string, note?: string): Promise<LockupExecutionResult> {
    // Get current status
    const status = await this.getCurrentStatus()

    // Verify member holds lockup
    if (status.currentHolderId !== performedById) {
      // Check if they have lockup auth for backwards compatibility
      const hasAuth = await this.checkMemberHasLockupAuth(performedById)
      if (!hasAuth) {
        throw new ValidationError('Member is not authorized to perform lockup')
      }
    }

    // Mark building as locking up
    await this.lockupRepo.markLockingUp(status.id)

    const { members, visitors } = await this.getPresentMembersForLockup()

    const checkedOutMembers: Array<{ id: string; name: string }> = []
    const checkedOutVisitors: Array<{ id: string; name: string }> = []
    const now = new Date()

    // Process member checkouts
    for (const member of members) {
      try {
        if (member.id === performedById) {
          continue
        }

        const memberData = await this.prisma.member.findUnique({
          where: { id: member.id },
          select: { badgeId: true, firstName: true, lastName: true, rank: true },
        })

        if (!memberData?.badgeId) {
          continue
        }

        await this.checkinRepo.create({
          memberId: member.id,
          badgeId: memberData.badgeId,
          direction: 'out',
          timestamp: now,
          kioskId: 'lockup-checkout',
          synced: true,
        })

        await this.presenceService.setMemberDirection(member.id, 'out')

        checkedOutMembers.push({
          id: member.id,
          name: `${memberData.rank} ${memberData.firstName} ${memberData.lastName}`,
        })
      } catch (error) {
        serviceLogger.error('Failed to checkout member during lockup', { memberId: member.id, error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Process visitor checkouts
    for (const visitor of visitors) {
      try {
        await this.visitorRepo.checkout(visitor.id)

        checkedOutVisitors.push({
          id: visitor.id,
          name: visitor.name,
        })
      } catch (error) {
        serviceLogger.error('Failed to checkout visitor during lockup', { visitorId: visitor.id, error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Checkout performer last
    const performer = members.find((m) => m.id === performedById)
    if (performer) {
      try {
        const performerData = await this.prisma.member.findUnique({
          where: { id: performedById },
          select: { badgeId: true, firstName: true, lastName: true, rank: true },
        })

        if (performerData?.badgeId) {
          await this.checkinRepo.create({
            memberId: performedById,
            badgeId: performerData.badgeId,
            direction: 'out',
            timestamp: now,
            kioskId: 'lockup-checkout',
            synced: true,
          })

          await this.presenceService.setMemberDirection(performedById, 'out')

          checkedOutMembers.push({
            id: performedById,
            name: `${performerData.rank} ${performerData.firstName} ${performerData.lastName}`,
          })
        }
      } catch (error) {
        serviceLogger.error('Failed to checkout performer during lockup', { performedById, error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Create lockup execution record
    const execution = await this.lockupRepo.createExecution({
      lockupStatusId: status.id,
      executedBy: performedById,
      membersCheckedOut: checkedOutMembers,
      visitorsCheckedOut: checkedOutVisitors,
      totalCheckedOut: checkedOutMembers.length + checkedOutVisitors.length,
      notes: note,
    })

    // Mark building as secured
    await this.lockupRepo.markSecured(status.id, performedById)

    // Legacy audit log for backwards compatibility
    await this.prisma.responsibilityAuditLog.create({
      data: {
        memberId: performedById,
        tagName: 'Lockup',
        action: 'building_lockup',
        performedBy: performedById,
        performedByType: 'member',
        notes:
          note ??
          `Lockup executed. Checked out ${checkedOutMembers.length} members and ${checkedOutVisitors.length} visitors.`,
      },
    })

    // Get performer name for broadcast
    const performerData = await this.prisma.member.findUnique({
      where: { id: performedById },
      select: { firstName: true, lastName: true },
    })

    // Broadcast lockup execution to admin subscribers
    if (performerData) {
      broadcastLockupExecution({
        performedBy: performedById,
        performedByName: `${performerData.firstName} ${performerData.lastName}`,
        membersCheckedOut: checkedOutMembers.length,
        visitorsCheckedOut: checkedOutVisitors.length,
        timestamp: now.toISOString(),
      })
    }

    return {
      checkedOut: {
        members: checkedOutMembers.map((m) => m.id),
        visitors: checkedOutVisitors.map((v) => v.id),
      },
      executionId: execution.id,
    }
  }
}

export const lockupService = new LockupService()
