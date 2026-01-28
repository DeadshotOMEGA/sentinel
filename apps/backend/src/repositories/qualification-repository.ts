import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

/**
 * Qualification Type entity from database
 */
export interface QualificationType {
  id: string
  code: string
  name: string
  description: string | null
  canReceiveLockup: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Member Qualification entity from database
 */
export interface MemberQualification {
  id: string
  memberId: string
  qualificationTypeId: string
  status: string
  grantedAt: Date
  grantedBy: string | null
  expiresAt: Date | null
  revokedAt: Date | null
  revokedBy: string | null
  revokeReason: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Member Qualification with type info
 */
export interface MemberQualificationWithType extends MemberQualification {
  qualificationType: QualificationType
}

/**
 * Member Qualification with all details for display
 */
export interface MemberQualificationWithDetails extends MemberQualificationWithType {
  member?: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  grantedByAdmin?: {
    id: string
    displayName: string
  } | null
  revokedByAdmin?: {
    id: string
    displayName: string
  } | null
}

/**
 * Input for granting a qualification
 */
export interface GrantQualificationInput {
  memberId: string
  qualificationTypeId: string
  grantedBy?: string | null
  expiresAt?: Date | null
  notes?: string | null
}

/**
 * Lockup eligible member info
 */
export interface LockupEligibleMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  isCheckedIn: boolean
  qualifications: Array<{
    code: string
    name: string
  }>
}

/**
 * Repository for managing qualifications
 */
export class QualificationRepository {
  private prisma: PrismaClientInstance

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
  }

  // ============================================================================
  // Qualification Types
  // ============================================================================

  /**
   * Get all qualification types
   */
  async findAllTypes(): Promise<QualificationType[]> {
    const types = await this.prisma.qualificationType.findMany({
      orderBy: { displayOrder: 'asc' },
    })
    return types
  }

  /**
   * Get a qualification type by ID
   */
  async findTypeById(id: string): Promise<QualificationType | null> {
    return this.prisma.qualificationType.findUnique({
      where: { id },
    })
  }

  /**
   * Get a qualification type by code
   */
  async findTypeByCode(code: string): Promise<QualificationType | null> {
    return this.prisma.qualificationType.findUnique({
      where: { code },
    })
  }

  /**
   * Get all qualification types that allow lockup
   */
  async findLockupEligibleTypes(): Promise<QualificationType[]> {
    const types = await this.prisma.qualificationType.findMany({
      where: { canReceiveLockup: true },
      orderBy: { displayOrder: 'asc' },
    })
    return types
  }

  // ============================================================================
  // Member Qualifications
  // ============================================================================

  /**
   * Get all qualifications for a member
   */
  async findByMemberId(memberId: string): Promise<MemberQualificationWithType[]> {
    const qualifications = await this.prisma.memberQualification.findMany({
      where: { memberId },
      include: {
        qualificationType: true,
      },
      orderBy: [{ qualificationType: { displayOrder: 'asc' } }],
    })
    return qualifications
  }

  /**
   * Get active qualifications for a member
   */
  async findActiveByMemberId(memberId: string): Promise<MemberQualificationWithType[]> {
    const qualifications = await this.prisma.memberQualification.findMany({
      where: {
        memberId,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        qualificationType: true,
      },
      orderBy: [{ qualificationType: { displayOrder: 'asc' } }],
    })
    return qualifications
  }

  /**
   * Get a specific qualification by ID
   */
  async findById(id: string): Promise<MemberQualificationWithDetails | null> {
    const qualification = await this.prisma.memberQualification.findUnique({
      where: { id },
      include: {
        qualificationType: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rank: true,
            serviceNumber: true,
          },
        },
        grantedByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
        revokedByAdmin: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })
    return qualification
  }

  /**
   * Check if a member has a specific qualification type (active only)
   */
  async memberHasQualification(memberId: string, qualificationTypeId: string): Promise<boolean> {
    const count = await this.prisma.memberQualification.count({
      where: {
        memberId,
        qualificationTypeId,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })
    return count > 0
  }

  /**
   * Check if a member can receive lockup (has any lockup-eligible qualification)
   */
  async canMemberReceiveLockup(memberId: string): Promise<boolean> {
    const count = await this.prisma.memberQualification.count({
      where: {
        memberId,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        qualificationType: {
          canReceiveLockup: true,
        },
      },
    })
    return count > 0
  }

  /**
   * Grant a qualification to a member
   */
  async grant(input: GrantQualificationInput): Promise<MemberQualificationWithType> {
    const qualification = await this.prisma.memberQualification.create({
      data: {
        memberId: input.memberId,
        qualificationTypeId: input.qualificationTypeId,
        grantedBy: input.grantedBy,
        expiresAt: input.expiresAt,
        notes: input.notes,
        status: 'active',
      },
      include: {
        qualificationType: true,
      },
    })
    return qualification
  }

  /**
   * Revoke a qualification
   */
  async revoke(
    id: string,
    revokedBy?: string | null,
    revokeReason?: string | null
  ): Promise<MemberQualificationWithType> {
    const qualification = await this.prisma.memberQualification.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
        revokeReason,
      },
      include: {
        qualificationType: true,
      },
    })
    return qualification
  }

  /**
   * Delete a qualification (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.prisma.memberQualification.delete({
      where: { id },
    })
  }

  // ============================================================================
  // Lockup Eligibility
  // ============================================================================

  /**
   * Get all members eligible to receive lockup responsibility
   *
   * @param checkedInOnly - Only include members currently checked in
   */
  async findLockupEligibleMembers(checkedInOnly = false): Promise<LockupEligibleMember[]> {
    // Get all members with active lockup-eligible qualifications
    const members = await this.prisma.member.findMany({
      where: {
        status: 'active',
        qualifications: {
          some: {
            status: 'active',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            qualificationType: {
              canReceiveLockup: true,
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rank: true,
        serviceNumber: true,
        checkins: {
          where: {
            direction: 'in',
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            direction: true,
            timestamp: true,
          },
        },
        qualifications: {
          where: {
            status: 'active',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            qualificationType: {
              canReceiveLockup: true,
            },
          },
          select: {
            qualificationType: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    // Determine if each member is currently checked in
    // A member is checked in if their last checkin is 'in' (not 'out')
    const result: LockupEligibleMember[] = []

    for (const member of members) {
      // Check if their most recent check-in is 'in' (meaning they haven't checked out yet)
      // We need to look at the latest checkin regardless of direction
      const latestCheckin = await this.prisma.checkin.findFirst({
        where: { memberId: member.id },
        orderBy: { timestamp: 'desc' },
        select: { direction: true },
      })

      const isCheckedIn = latestCheckin?.direction === 'in'

      // Filter if checkedInOnly is true
      if (checkedInOnly && !isCheckedIn) {
        continue
      }

      result.push({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        serviceNumber: member.serviceNumber,
        isCheckedIn,
        qualifications: member.qualifications.map((q) => ({
          code: q.qualificationType.code,
          name: q.qualificationType.name,
        })),
      })
    }

    return result
  }

  /**
   * Get count of active qualifications by type
   */
  async countByType(): Promise<Array<{ typeCode: string; typeName: string; count: number }>> {
    const counts = await this.prisma.memberQualification.groupBy({
      by: ['qualificationTypeId'],
      where: {
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _count: true,
    })

    // Get type details
    const types = await this.prisma.qualificationType.findMany({
      where: {
        id: { in: counts.map((c) => c.qualificationTypeId) },
      },
    })

    const typeMap = new Map(types.map((t) => [t.id, t]))

    return counts.map((c) => {
      const type = typeMap.get(c.qualificationTypeId)
      return {
        typeCode: type?.code ?? '',
        typeName: type?.name ?? '',
        count: c._count,
      }
    })
  }
}
