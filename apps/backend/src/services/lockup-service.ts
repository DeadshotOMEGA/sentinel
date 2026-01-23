import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { VisitorRepository } from '../repositories/visitor-repository.js'
import { PresenceService } from './presence-service.js'
import { NotFoundError, ValidationError } from '../middleware/error-handler.js'

import { broadcastLockupExecution } from '../websocket/broadcast.js'

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
  auditLogId: string
}

/**
 * Service for building lockup operations
 * Allows designated members with "Lockup" tag to bulk checkout all present people
 */
export class LockupService {
  private prisma: PrismaClient
  private checkinRepo: CheckinRepository
  private visitorRepo: VisitorRepository
  private presenceService: PresenceService

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
    this.checkinRepo = new CheckinRepository(this.prisma)
    this.visitorRepo = new VisitorRepository(this.prisma)
    this.presenceService = new PresenceService(this.prisma)
  }

  /**
   * Check if a member has the "Lockup" tag
   */
  async checkMemberHasLockupTag(memberId: string): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    const lockupTag = await this.prisma.memberTag.findFirst({
      where: {
        memberId,
        tag: {
          name: 'Lockup',
        },
      },
    })

    return lockupTag !== null
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
   */
  async executeLockup(performedById: string, note?: string): Promise<LockupExecutionResult> {
    const hasLockupTag = await this.checkMemberHasLockupTag(performedById)
    if (!hasLockupTag) {
      throw new ValidationError('Member is not authorized to perform lockup')
    }

    const { members, visitors } = await this.getPresentMembersForLockup()

    const checkedOutMembers: string[] = []
    const checkedOutVisitors: string[] = []
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

        // TODO Phase 3: Broadcast checkin event
        // broadcastCheckin({ ... })

        checkedOutMembers.push(member.id)
      } catch (error) {
        console.error(`Failed to checkout member ${member.id} during lockup:`, error)
      }
    }

    // Process visitor checkouts
    for (const visitor of visitors) {
      try {
        await this.visitorRepo.checkout(visitor.id)

        // TODO Phase 3: Broadcast visitor signout

        checkedOutVisitors.push(visitor.id)
      } catch (error) {
        console.error(`Failed to checkout visitor ${visitor.id} during lockup:`, error)
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

          // TODO Phase 3: Broadcast checkin event
          // broadcastCheckin({ ... })

          checkedOutMembers.push(performedById)
        }
      } catch (error) {
        console.error(`Failed to checkout performer ${performedById} during lockup:`, error)
      }
    }

    // Create audit log
    const auditLog = await this.prisma.responsibilityAuditLog.create({
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
        members: checkedOutMembers,
        visitors: checkedOutVisitors,
      },
      auditLogId: auditLog.id,
    }
  }
}

export const lockupService = new LockupService()
