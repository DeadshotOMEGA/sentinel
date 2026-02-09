import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

/**
 * Tag info embedded in qualification type
 */
export interface QualificationTypeTag {
  id: string
  name: string
  chipVariant: string
  chipColor: string
}

/**
 * Qualification Type entity from database
 */
export interface QualificationType {
  id: string
  code: string
  name: string
  description: string | null
  canReceiveLockup: boolean
  isAutomatic: boolean
  displayOrder: number
  tagId: string | null
  tag: QualificationTypeTag | null
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
 * Input for creating a qualification type
 */
export interface CreateQualificationTypeInput {
  code: string
  name: string
  description?: string | null
  canReceiveLockup?: boolean
  isAutomatic?: boolean
  displayOrder?: number
  tagId?: string | null
}

/**
 * Input for updating a qualification type
 */
export interface UpdateQualificationTypeInput {
  code?: string
  name?: string
  description?: string | null
  canReceiveLockup?: boolean
  isAutomatic?: boolean
  displayOrder?: number
  tagId?: string | null
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
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            chipVariant: true,
            chipColor: true,
          },
        },
      },
    })
    return types
  }

  /**
   * Get a qualification type by ID
   */
  async findTypeById(id: string): Promise<QualificationType | null> {
    return this.prisma.qualificationType.findUnique({
      where: { id },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            chipVariant: true,
            chipColor: true,
          },
        },
      },
    })
  }

  /**
   * Get a qualification type by code
   */
  async findTypeByCode(code: string): Promise<QualificationType | null> {
    return this.prisma.qualificationType.findUnique({
      where: { code },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            chipVariant: true,
            chipColor: true,
          },
        },
      },
    })
  }

  /**
   * Get all qualification types that allow lockup
   */
  async findLockupEligibleTypes(): Promise<QualificationType[]> {
    const types = await this.prisma.qualificationType.findMany({
      where: { canReceiveLockup: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            chipVariant: true,
            chipColor: true,
          },
        },
      },
    })
    return types
  }

  /**
   * Create a new qualification type
   */
  async createType(input: CreateQualificationTypeInput): Promise<QualificationType> {
    const qualificationType = await this.prisma.qualificationType.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        canReceiveLockup: input.canReceiveLockup ?? true,
        isAutomatic: input.isAutomatic ?? false,
        displayOrder: input.displayOrder ?? 0,
        tagId: input.tagId,
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            chipVariant: true,
            chipColor: true,
          },
        },
      },
    })
    return qualificationType
  }

  /**
   * Update a qualification type
   */
  async updateType(id: string, input: UpdateQualificationTypeInput): Promise<QualificationType> {
    const qualificationType = await this.prisma.qualificationType.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        canReceiveLockup: input.canReceiveLockup,
        isAutomatic: input.isAutomatic,
        displayOrder: input.displayOrder,
        tagId: input.tagId,
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            chipVariant: true,
            chipColor: true,
          },
        },
      },
    })
    return qualificationType
  }

  /**
   * Delete a qualification type
   */
  async deleteType(id: string): Promise<void> {
    await this.prisma.qualificationType.delete({
      where: { id },
    })
  }

  /**
   * Count members with a specific qualification type (active only)
   */
  async countMembersByType(qualificationTypeId: string): Promise<number> {
    return this.prisma.memberQualification.count({
      where: { qualificationTypeId, status: 'active' },
    })
  }

  /**
   * Delete all non-active (revoked/expired) member qualifications for a type
   */
  async deleteInactiveMemberQualificationsByType(qualificationTypeId: string): Promise<void> {
    await this.prisma.memberQualification.deleteMany({
      where: {
        qualificationTypeId,
        status: { not: 'active' },
      },
    })
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
        qualificationType: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                chipVariant: true,
                chipColor: true,
              },
            },
          },
        },
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
        qualificationType: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                chipVariant: true,
                chipColor: true,
              },
            },
          },
        },
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
        qualificationType: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                chipVariant: true,
                chipColor: true,
              },
            },
          },
        },
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
   * Check if a member can receive lockup (has at least one lockup-eligible qualification)
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
    const includeClause = {
      qualificationType: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              chipVariant: true,
              chipColor: true,
            },
          },
        },
      },
    }

    // Check for existing revoked/expired record (unique constraint on memberId + qualificationTypeId)
    const existing = await this.prisma.memberQualification.findUnique({
      where: {
        memberId_qualificationTypeId: {
          memberId: input.memberId,
          qualificationTypeId: input.qualificationTypeId,
        },
      },
    })

    if (existing) {
      // Re-activate the existing record
      const qualification = await this.prisma.memberQualification.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          grantedBy: input.grantedBy,
          expiresAt: input.expiresAt,
          notes: input.notes,
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        },
        include: includeClause,
      })
      return qualification
    }

    const qualification = await this.prisma.memberQualification.create({
      data: {
        memberId: input.memberId,
        qualificationTypeId: input.qualificationTypeId,
        grantedBy: input.grantedBy,
        expiresAt: input.expiresAt,
        notes: input.notes,
        status: 'active',
      },
      include: includeClause,
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
        qualificationType: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                chipVariant: true,
                chipColor: true,
              },
            },
          },
        },
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
