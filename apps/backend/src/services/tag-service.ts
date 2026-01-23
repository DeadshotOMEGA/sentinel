import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { NotFoundError } from '../middleware/error-handler.js'

export interface LockupHolder {
  id: string
  rank: string
  firstName: string
  lastName: string
}

export interface TransferLockupResult {
  success: boolean
  previousHolder: LockupHolder | null
  newHolder: LockupHolder
}

type PerformedByType = 'admin' | 'member' | 'system'

/**
 * Service for managing tag transfers (specifically the Lockup tag)
 * The Lockup tag indicates who is responsible for building lockup at end of day
 */
export class TagService {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
  }

  /**
   * Get the member who currently holds the Lockup tag
   * Returns null if no one has the tag
   */
  async getCurrentLockupHolder(): Promise<LockupHolder | null> {
    const memberTag = await this.prisma.memberTag.findFirst({
      where: {
        tag: {
          name: 'Lockup',
        },
      },
      include: {
        member: {
          select: {
            id: true,
            rank: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!memberTag) {
      return null
    }

    return {
      id: memberTag.member.id,
      rank: memberTag.member.rank,
      firstName: memberTag.member.firstName,
      lastName: memberTag.member.lastName,
    }
  }

  /**
   * Transfer the Lockup tag from current holder to a new member
   * - Idempotent: returns success if target already has the tag
   * - Fails silently if no current holder (returns early)
   * - Creates audit trail of all transfers
   * - Removes tag from ALL current holders (handles data integrity issues)
   */
  async transferLockupTag(
    toMemberId: string,
    performedBy: string,
    performedByType: PerformedByType,
    notes?: string
  ): Promise<TransferLockupResult | null> {
    // Get the Lockup tag
    const lockupTag = await this.prisma.tag.findUnique({
      where: { name: 'Lockup' },
    })

    if (!lockupTag) {
      throw new NotFoundError('Tag', 'Lockup')
    }

    // Get current holder (for audit trail)
    const currentHolder = await this.getCurrentLockupHolder()

    // Fail silently if no current holder
    if (!currentHolder) {
      return null
    }

    // Check if target member already has the tag (idempotent)
    if (currentHolder.id === toMemberId) {
      return {
        success: true,
        previousHolder: currentHolder,
        newHolder: currentHolder,
      }
    }

    // Verify target member exists
    const targetMember = await this.prisma.member.findUnique({
      where: { id: toMemberId },
      select: {
        id: true,
        rank: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!targetMember) {
      throw new NotFoundError('Member', toMemberId)
    }

    // Use transaction to transfer tag and create audit log
    await this.prisma.$transaction([
      // Remove tag from ALL current holders (handles data integrity issues)
      this.prisma.memberTag.deleteMany({
        where: {
          tagId: lockupTag.id,
        },
      }),
      // Add tag to new holder
      this.prisma.memberTag.create({
        data: {
          memberId: toMemberId,
          tagId: lockupTag.id,
        },
      }),
      // Create audit log entry
      this.prisma.responsibilityAuditLog.create({
        data: {
          memberId: toMemberId,
          tagName: 'Lockup',
          action: 'transferred',
          fromMemberId: currentHolder.id,
          toMemberId: toMemberId,
          performedBy: performedBy,
          performedByType: performedByType,
          notes: notes ?? null,
        },
      }),
    ])

    const newHolder: LockupHolder = {
      id: targetMember.id,
      rank: targetMember.rank,
      firstName: targetMember.firstName,
      lastName: targetMember.lastName,
    }

    return {
      success: true,
      previousHolder: currentHolder,
      newHolder,
    }
  }
}

export const tagService = new TagService()
