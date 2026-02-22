import type {
  Member,
  MemberWithDivision,
  CreateMemberInput,
  UpdateMemberInput,
  MemberType,
  MemberStatus,
  PaginationParams,
  MemberFilterParams,
} from '@sentinel/types'
import type { PrismaClientInstance, Member as PrismaMember } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { RankRepository } from './rank-repository.js'
import {
  buildMemberDisplayName,
  computeCollisionKey,
  getMemberInitials,
  normalizeNamePart,
} from '../utils/display-name.js'
import { getSentinelBootstrapIdentity } from '../lib/system-bootstrap.js'

interface MemberFilters extends MemberFilterParams {
  divisionId?: string
  memberType?: MemberType
  status?: MemberStatus
  search?: string
  hasBadge?: boolean
  qualificationCode?: string
  includeHidden?: boolean
}

/**
 * Convert Prisma Member (with null) to shared Member type (with undefined)
 */
function toMember(prismaMember: PrismaMember): Member {
  return {
    id: prismaMember.id,
    serviceNumber: prismaMember.serviceNumber,
    employeeNumber: prismaMember.employeeNumber ?? undefined,
    firstName: prismaMember.firstName,
    lastName: prismaMember.lastName,
    displayName: prismaMember.displayName ?? undefined,
    initials: prismaMember.initials ?? undefined,
    rank: prismaMember.rank,
    divisionId: prismaMember.divisionId ?? undefined,
    mess: prismaMember.mess ?? undefined,
    moc: prismaMember.moc ?? undefined,
    memberType: prismaMember.memberType as MemberType,
    memberTypeId: prismaMember.memberTypeId ?? undefined,
    memberStatusId: prismaMember.memberStatusId ?? undefined,
    classDetails: prismaMember.classDetails ?? undefined,
    notes: prismaMember.notes ?? undefined,
    contractStart: prismaMember.contract_start ?? undefined,
    contractEnd: prismaMember.contract_end ?? undefined,
    status: prismaMember.status as MemberStatus,
    email: prismaMember.email ?? undefined,
    homePhone: prismaMember.homePhone ?? undefined,
    mobilePhone: prismaMember.mobilePhone ?? undefined,
    badgeId: prismaMember.badgeId ?? undefined,
    missedCheckoutCount: prismaMember.missedCheckoutCount,
    lastMissedCheckout: prismaMember.lastMissedCheckout ?? undefined,
    createdAt: prismaMember.createdAt ?? new Date(),
    updatedAt: prismaMember.updatedAt ?? new Date(),
  }
}

/**
 * Convert Prisma Member with Division to MemberWithDivision type
 */
function toMemberWithDivision(
  prismaMember: PrismaMember & {
    division: {
      id: string
      name: string
      code: string
      description: string | null
      createdAt: Date | null
      updatedAt: Date | null
    } | null
    badge?: {
      id: string
      serialNumber: string
      assignmentType: string
      assignedToId: string | null
      status: string
      lastUsed: Date | null
      createdAt: Date | null
      updatedAt: Date | null
      badgeStatusRef?: {
        id: string
        code: string
        name: string
        chipVariant: string
        chipColor: string
      } | null
    } | null
    rankRef?: {
      id: string
      code: string
      name: string
      branch: string
      category: string
      displayOrder: number
      isActive: boolean
      replacedBy: string | null
      createdAt: Date | null
      updatedAt: Date | null
    } | null
    memberTags?: Array<{
      tag: {
        id: string
        name: string
        description: string | null
        displayOrder: number
        chipVariant: string
        chipColor: string
        createdAt: Date | null
        updatedAt: Date | null
      }
    }>
    qualifications?: Array<{
      qualificationType: {
        code: string
        name: string
        tagId: string | null
        tag?: {
          chipVariant: string
          chipColor: string
        } | null
      }
    }>
  }
): MemberWithDivision {
  const base = {
    ...toMember(prismaMember),
    division: prismaMember.division
      ? {
          id: prismaMember.division.id,
          name: prismaMember.division.name,
          code: prismaMember.division.code,
          description: prismaMember.division.description ?? undefined,
          createdAt: prismaMember.division.createdAt ?? new Date(),
          updatedAt: prismaMember.division.updatedAt ?? new Date(),
        }
      : undefined,
  }

  // Add badge if included and exists
  if (prismaMember.badge) {
    Object.assign(base, {
      badge: {
        id: prismaMember.badge.id,
        serialNumber: prismaMember.badge.serialNumber,
        assignmentType: prismaMember.badge.assignmentType,
        assignedToId: prismaMember.badge.assignedToId ?? undefined,
        status: prismaMember.badge.status,
        lastUsed: prismaMember.badge.lastUsed ?? undefined,
        createdAt: prismaMember.badge.createdAt ?? new Date(),
        updatedAt: prismaMember.badge.updatedAt ?? new Date(),
        badgeStatusSummary: prismaMember.badge.badgeStatusRef
          ? {
              name: prismaMember.badge.badgeStatusRef.name,
              chipVariant: prismaMember.badge.badgeStatusRef.chipVariant,
              chipColor: prismaMember.badge.badgeStatusRef.chipColor,
            }
          : undefined,
      },
    })
  }

  // Add rank details if included and exists
  if (prismaMember.rankRef) {
    Object.assign(base, {
      rankDetails: {
        id: prismaMember.rankRef.id,
        code: prismaMember.rankRef.code,
        name: prismaMember.rankRef.name,
        branch: prismaMember.rankRef.branch,
        category: prismaMember.rankRef.category,
        displayOrder: prismaMember.rankRef.displayOrder,
        isActive: prismaMember.rankRef.isActive,
        createdAt: prismaMember.rankRef.createdAt ?? new Date(),
        updatedAt: prismaMember.rankRef.updatedAt ?? new Date(),
      },
    })
  }

  // Add tags if included
  if (prismaMember.memberTags) {
    Object.assign(base, {
      tags: prismaMember.memberTags.map((mt) => ({
        id: mt.tag.id,
        name: mt.tag.name,
        description: mt.tag.description ?? undefined,
        displayOrder: mt.tag.displayOrder,
        chipVariant: mt.tag.chipVariant,
        chipColor: mt.tag.chipColor,
        createdAt: mt.tag.createdAt ?? new Date(),
        updatedAt: mt.tag.updatedAt ?? new Date(),
      })),
    })
  }

  // Add qualifications if included
  if (prismaMember.qualifications) {
    Object.assign(base, {
      qualifications: prismaMember.qualifications.map((q) => ({
        code: q.qualificationType.code,
        name: q.qualificationType.name,
        chipVariant: q.qualificationType.tag?.chipVariant ?? null,
        chipColor: q.qualificationType.tag?.chipColor ?? null,
        tagId: q.qualificationType.tagId ?? null,
      })),
    })
  }

  return base
}

export class MemberRepository {
  private prisma: PrismaClientInstance
  private rankRepository: RankRepository

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
    this.rankRepository = new RankRepository(this.prisma)
  }

  private getDisplayKeyForMember(member: {
    lastName?: string | null
    firstName?: string | null
    initials?: string | null
  }): string {
    const lastName = normalizeNamePart(member.lastName)
    const initials = getMemberInitials(member.firstName, member.initials)
    return computeCollisionKey(lastName, initials)
  }

  private async assertNotProtectedSentinelMember(
    memberId: string,
    operation: string,
    updateData?: Record<string, unknown>
  ): Promise<void> {
    const identity = await getSentinelBootstrapIdentity(this.prisma)
    if (!identity || identity.memberId !== memberId) {
      return
    }

    if (!updateData) {
      throw new Error(`Cannot ${operation} the protected Sentinel bootstrap member`)
    }

    const disallowedKeys = ['status', 'serviceNumber', 'badgeId']
    if (disallowedKeys.some((key) => key in updateData)) {
      throw new Error(`Cannot ${operation} the protected Sentinel bootstrap member`)
    }
  }

  private async recomputeDisplayNamesByKeys(
    tx: PrismaClientInstance,
    keys: Set<string>
  ): Promise<void> {
    const normalizedKeys = Array.from(keys).filter(Boolean)
    if (normalizedKeys.length === 0) return

    const members = await tx.member.findMany({
      select: {
        id: true,
        rank: true,
        firstName: true,
        lastName: true,
        initials: true,
      },
    })

    const collisionCounts = new Map<string, number>()
    for (const member of members) {
      const key = this.getDisplayKeyForMember(member)
      if (!key) continue
      collisionCounts.set(key, (collisionCounts.get(key) ?? 0) + 1)
    }

    const updates = members
      .filter((member) => normalizedKeys.includes(this.getDisplayKeyForMember(member)))
      .map((member) => {
        const key = this.getDisplayKeyForMember(member)
        const useLongForm = (collisionCounts.get(key) ?? 0) > 1
        const displayName = buildMemberDisplayName({
          rank: member.rank,
          firstName: member.firstName,
          lastName: member.lastName,
          initials: member.initials,
          useLongForm,
          fallback: `${member.firstName} ${member.lastName}`.trim(),
        })
        return tx.member.update({
          where: { id: member.id },
          data: { displayName },
        })
      })

    if (updates.length > 0) {
      await Promise.all(updates)
    }
  }

  /**
   * Find all members with optional filters
   */
  async findAll(filters?: MemberFilters): Promise<MemberWithDivision[]> {
    const where: Record<string, unknown> = {}

    if (filters?.divisionId) {
      where.divisionId = filters.divisionId
    }

    if (filters?.memberType) {
      where.memberType = filters.memberType
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.mess) {
      where.mess = filters.mess
    }

    if (filters?.moc) {
      where.moc = filters.moc
    }

    if (filters?.division) {
      where.division = {
        code: filters.division,
      }
    }

    if (filters?.contract) {
      const now = new Date()
      const thirtyDaysFromNow = new Date(now)
      thirtyDaysFromNow.setDate(now.getDate() + 30)

      if (filters.contract === 'active') {
        where.contract_end = {
          gte: now,
        }
      } else if (filters.contract === 'expiring_soon') {
        where.contract_end = {
          gte: now,
          lte: thirtyDaysFromNow,
        }
      } else if (filters.contract === 'expired') {
        where.contract_end = {
          lt: now,
        }
      }
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.memberTags = {
        some: {
          tag: {
            name: {
              in: filters.tags,
            },
          },
        },
      }
    }

    if (filters?.excludeTags && filters.excludeTags.length > 0) {
      where.NOT = {
        memberTags: {
          some: {
            tag: {
              name: {
                in: filters.excludeTags,
              },
            },
          },
        },
      }
    }

    if (filters?.hasBadge !== undefined) {
      if (filters.hasBadge) {
        where.badgeId = { not: null }
      } else {
        where.badgeId = null
      }
    }

    if (filters?.qualificationCode) {
      where.qualifications = {
        some: {
          status: 'active',
          qualificationType: {
            code: filters.qualificationCode,
          },
        },
      }
    }

    if (filters?.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { serviceNumber: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    // Exclude members with hidden statuses unless explicitly included
    if (!filters?.includeHidden) {
      const existingAnd = (where.AND as Record<string, unknown>[]) ?? []
      where.AND = [
        ...existingAnd,
        {
          OR: [{ memberStatusId: null }, { memberStatusRef: { isHidden: false } }],
        },
      ]
    }

    const members = await this.prisma.member.findMany({
      where,
      include: {
        division: true,
        badge: {
          include: {
            badgeStatusRef: true,
          },
        },
        rankRef: true,
        memberTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return members.map(toMemberWithDivision)
  }

  /**
   * Find paginated members with optional filters
   */
  async findPaginated(
    params: PaginationParams,
    filters?: MemberFilters
  ): Promise<{
    members: MemberWithDivision[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    if (!params.page || params.page < 1) {
      throw new Error('Invalid page number: must be >= 1')
    }
    if (!params.limit || params.limit < 1 || params.limit > 500) {
      throw new Error('Invalid limit: must be between 1 and 500')
    }

    const page = params.page
    const limit = params.limit
    const sortOrder = params.sortOrder ? params.sortOrder : 'asc'

    // Validate and sanitize sortBy column (allowlist)
    const allowedSortColumns: Record<
      string,
      'lastName' | 'rank' | 'status' | 'firstName' | 'serviceNumber'
    > = {
      lastName: 'lastName',
      rank: 'rank',
      status: 'status',
      firstName: 'firstName',
      serviceNumber: 'serviceNumber',
    }
    const sortByColumn =
      params.sortBy && allowedSortColumns[params.sortBy]
        ? allowedSortColumns[params.sortBy]
        : 'lastName'

    const skip = (page - 1) * limit

    // Build where conditions (same as findAll)
    const where: Record<string, unknown> = {}

    if (filters?.divisionId) {
      where.divisionId = filters.divisionId
    }

    if (filters?.memberType) {
      where.memberType = filters.memberType
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.mess) {
      where.mess = filters.mess
    }

    if (filters?.moc) {
      where.moc = filters.moc
    }

    if (filters?.division) {
      where.division = {
        code: filters.division,
      }
    }

    if (filters?.contract) {
      const now = new Date()
      const thirtyDaysFromNow = new Date(now)
      thirtyDaysFromNow.setDate(now.getDate() + 30)

      if (filters.contract === 'active') {
        where.contract_end = {
          gte: now,
        }
      } else if (filters.contract === 'expiring_soon') {
        where.contract_end = {
          gte: now,
          lte: thirtyDaysFromNow,
        }
      } else if (filters.contract === 'expired') {
        where.contract_end = {
          lt: now,
        }
      }
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.memberTags = {
        some: {
          tag: {
            name: {
              in: filters.tags,
            },
          },
        },
      }
    }

    if (filters?.excludeTags && filters.excludeTags.length > 0) {
      where.NOT = {
        memberTags: {
          some: {
            tag: {
              name: {
                in: filters.excludeTags,
              },
            },
          },
        },
      }
    }

    if (filters?.hasBadge !== undefined) {
      if (filters.hasBadge) {
        where.badgeId = { not: null }
      } else {
        where.badgeId = null
      }
    }

    if (filters?.qualificationCode) {
      where.qualifications = {
        some: {
          status: 'active',
          qualificationType: {
            code: filters.qualificationCode,
          },
        },
      }
    }

    if (filters?.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { serviceNumber: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    // Exclude members with hidden statuses unless explicitly included
    if (!filters?.includeHidden) {
      const existingAnd = (where.AND as Record<string, unknown>[]) ?? []
      where.AND = [
        ...existingAnd,
        {
          OR: [{ memberStatusId: null }, { memberStatusRef: { isHidden: false } }],
        },
      ]
    }

    // Execute count and data queries in parallel
    const [total, members] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.findMany({
        where,
        include: {
          division: true,
          badge: {
            include: {
              badgeStatusRef: true,
            },
          },
          rankRef: true,
          memberTags: {
            include: {
              tag: true,
            },
          },
          qualifications: {
            where: { status: 'active' },
            include: {
              qualificationType: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
        orderBy: [{ [sortByColumn as string]: sortOrder }, { firstName: sortOrder }],
        skip,
        take: limit,
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      members: members.map(toMemberWithDivision),
      total,
      page,
      limit,
      totalPages,
    }
  }

  /**
   * Find member by ID
   */
  async findById(id: string): Promise<MemberWithDivision | null> {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        division: true,
        badge: {
          include: {
            badgeStatusRef: true,
          },
        },
        memberTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return member ? toMemberWithDivision(member) : null
  }

  /**
   * Find member by service number
   */
  async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
    const member = await this.prisma.member.findUnique({
      where: { serviceNumber },
    })

    return member ? toMember(member) : null
  }

  /**
   * Create a new member
   */
  async create(data: CreateMemberInput): Promise<Member> {
    // Look up rank by code to get rankId
    const rank = await this.rankRepository.findByCode(data.rank)
    if (!rank) {
      throw new Error(`Invalid rank code: ${data.rank}`)
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          serviceNumber: data.serviceNumber,
          employeeNumber: data.employeeNumber !== undefined ? data.employeeNumber : null,
          firstName: data.firstName,
          lastName: data.lastName,
          initials: data.initials !== undefined ? data.initials : null,
          rank: data.rank,
          rankId: rank.id,
          divisionId: data.divisionId,
          mess: data.mess !== undefined ? data.mess : null,
          moc: data.moc !== undefined ? data.moc : null,
          memberType: data.memberType !== undefined ? data.memberType : 'regular',
          memberTypeId: data.memberTypeId !== undefined ? data.memberTypeId : null,
          classDetails: data.classDetails !== undefined ? data.classDetails : null,
          status: data.status !== undefined ? data.status : 'active',
          email: data.email !== undefined ? data.email : null,
          homePhone: data.homePhone !== undefined ? data.homePhone : null,
          mobilePhone: data.mobilePhone !== undefined ? data.mobilePhone : null,
          badgeId: data.badgeId !== undefined ? data.badgeId : null,
        },
      })

      const key = this.getDisplayKeyForMember(created)
      if (key) {
        await this.recomputeDisplayNamesByKeys(
          tx as unknown as PrismaClientInstance,
          new Set([key])
        )
      }

      return (await tx.member.findUniqueOrThrow({ where: { id: created.id } })) as PrismaMember
    })

    await this.invalidatePresenceCache()
    return toMember(member)
  }

  /**
   * Update a member
   */
  async update(id: string, data: UpdateMemberInput): Promise<Member> {
    const updateData: Record<string, unknown> = {}

    if (data.serviceNumber !== undefined) {
      updateData.serviceNumber = data.serviceNumber
    }
    if (data.employeeNumber !== undefined) {
      updateData.employeeNumber = data.employeeNumber
    }
    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName
    }
    if (data.initials !== undefined) {
      updateData.initials = data.initials
    }
    if (data.rank !== undefined) {
      const rank = await this.rankRepository.findByCode(data.rank)
      if (!rank) {
        throw new Error(`Invalid rank code: ${data.rank}`)
      }
      updateData.rank = data.rank
      updateData.rankId = rank.id
    }
    if (data.divisionId !== undefined) {
      updateData.divisionId = data.divisionId
    }
    if (data.mess !== undefined) {
      updateData.mess = data.mess
    }
    if (data.moc !== undefined) {
      updateData.moc = data.moc
    }
    if (data.memberType !== undefined) {
      updateData.memberType = data.memberType
    }
    if (data.memberTypeId !== undefined) {
      updateData.memberTypeId = data.memberTypeId
    }
    if (data.classDetails !== undefined) {
      updateData.classDetails = data.classDetails
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.email !== undefined) {
      updateData.email = data.email
    }
    if (data.homePhone !== undefined) {
      updateData.homePhone = data.homePhone
    }
    if (data.mobilePhone !== undefined) {
      updateData.mobilePhone = data.mobilePhone
    }
    if (data.badgeId !== undefined) {
      updateData.badgeId = data.badgeId
    }
    if (data.memberStatusId !== undefined) {
      updateData.memberStatusId = data.memberStatusId
    }

    // Handle tags separately - only process if tagIds array is provided
    const hasTagUpdate = data.tagIds !== undefined
    const hasFieldUpdate = Object.keys(updateData).length > 0

    if (!hasFieldUpdate && !hasTagUpdate) {
      throw new Error('No fields to update')
    }

    await this.assertNotProtectedSentinelMember(id, 'modify', updateData)

    // Use a transaction to update member and tags atomically
    const member = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.member.findUniqueOrThrow({
        where: { id },
        select: { id: true, rank: true, firstName: true, lastName: true, initials: true },
      })

      const keysToRecompute = new Set<string>()
      const oldKey = this.getDisplayKeyForMember(existing)
      if (oldKey) keysToRecompute.add(oldKey)

      // Update member fields if any
      let updatedMember
      if (hasFieldUpdate) {
        updatedMember = await tx.member.update({
          where: { id },
          data: updateData,
        })
      } else {
        updatedMember = await tx.member.findUniqueOrThrow({ where: { id } })
      }

      // Handle tagIds - replace all tags for this member
      if (hasTagUpdate && data.tagIds) {
        // Delete existing tags
        await tx.memberTag.deleteMany({
          where: { memberId: id },
        })

        // Create new tag associations
        if (data.tagIds.length > 0) {
          await tx.memberTag.createMany({
            data: data.tagIds.map((tagId) => ({
              memberId: id,
              tagId,
            })),
          })
        }
      }

      const newKey = this.getDisplayKeyForMember(updatedMember)
      if (newKey) keysToRecompute.add(newKey)
      if (keysToRecompute.size > 0) {
        await this.recomputeDisplayNamesByKeys(
          tx as unknown as PrismaClientInstance,
          keysToRecompute
        )
      }

      updatedMember = await tx.member.findUniqueOrThrow({ where: { id } })

      return updatedMember
    })

    await this.invalidatePresenceCache()
    return toMember(member)
  }

  /**
   * Delete (soft delete) a member
   */
  async delete(id: string): Promise<void> {
    await this.assertNotProtectedSentinelMember(id, 'deactivate')

    const result = await this.prisma.member.updateMany({
      where: { id },
      data: { status: 'inactive' },
    })

    if (result.count === 0) {
      throw new Error(`Member not found: ${id}`)
    }

    await this.invalidatePresenceCache()
  }

  /**
   * Get presence status for a member (present/absent)
   */
  async getPresenceStatus(memberId: string): Promise<'present' | 'absent'> {
    // First get the member's badge ID
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { badgeId: true },
    })

    if (!member?.badgeId) {
      return 'absent'
    }

    // Query checkin by badgeId (most recent)
    const checkin = await this.prisma.checkin.findFirst({
      where: { badgeId: member.badgeId },
      orderBy: { timestamp: 'desc' },
      select: { direction: true },
    })

    // Case-insensitive comparison
    return checkin?.direction.toLowerCase() === 'in' ? 'present' : 'absent'
  }

  /**
   * Find members by IDs (batch operation to prevent N+1 queries)
   */
  async findByIds(ids: string[]): Promise<MemberWithDivision[]> {
    if (ids.length === 0) {
      return []
    }

    const members = await this.prisma.member.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        division: true,
        badge: {
          include: {
            badgeStatusRef: true,
          },
        },
        memberTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return members.map(toMemberWithDivision)
  }

  /**
   * Find members by service numbers (for import operations)
   */
  async findByServiceNumbers(serviceNumbers: string[]): Promise<Member[]> {
    if (serviceNumbers.length === 0) {
      return []
    }

    const members = await this.prisma.member.findMany({
      where: {
        serviceNumber: { in: serviceNumbers },
      },
    })

    return members.map(toMember)
  }

  /**
   * Find members by tag IDs
   */
  async findByTags(tagIds: string[]): Promise<MemberWithDivision[]> {
    if (tagIds.length === 0) {
      return []
    }

    const members = await this.prisma.member.findMany({
      where: {
        memberTags: {
          some: {
            tagId: { in: tagIds },
          },
        },
      },
      include: {
        division: true,
        badge: {
          include: {
            badgeStatusRef: true,
          },
        },
        memberTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return members.map(toMemberWithDivision)
  }

  /**
   * Bulk create members (for import operations)
   */
  async bulkCreate(members: CreateMemberInput[]): Promise<number> {
    if (members.length === 0) {
      return 0
    }

    // Pre-fetch all ranks to avoid multiple queries in the transaction
    const uniqueRankCodes = [...new Set(members.map((m) => m.rank))]
    const ranks = await Promise.all(
      uniqueRankCodes.map(async (code) => {
        const rank = await this.rankRepository.findByCode(code)
        if (!rank) {
          throw new Error(`Invalid rank code: ${code}`)
        }
        return rank
      })
    )
    const rankMap = new Map(ranks.map((r) => [r.code, r.id]))

    const result = await this.prisma.$transaction(async (tx) => {
      let insertedCount = 0
      const keysToRecompute = new Set<string>()

      for (const memberData of members) {
        const rankId = rankMap.get(memberData.rank)
        if (!rankId) {
          throw new Error(`Invalid rank code: ${memberData.rank}`)
        }

        await tx.member.create({
          data: {
            serviceNumber: memberData.serviceNumber,
            employeeNumber:
              memberData.employeeNumber !== undefined ? memberData.employeeNumber : null,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            initials: memberData.initials !== undefined ? memberData.initials : null,
            rank: memberData.rank,
            rankId: rankId,
            divisionId: memberData.divisionId,
            mess: memberData.mess !== undefined ? memberData.mess : null,
            moc: memberData.moc !== undefined ? memberData.moc : null,
            memberType: memberData.memberType,
            memberTypeId: memberData.memberTypeId !== undefined ? memberData.memberTypeId : null,
            classDetails: memberData.classDetails !== undefined ? memberData.classDetails : null,
            status: memberData.status !== undefined ? memberData.status : 'active',
            email: memberData.email !== undefined ? memberData.email : null,
            homePhone: memberData.homePhone !== undefined ? memberData.homePhone : null,
            mobilePhone: memberData.mobilePhone !== undefined ? memberData.mobilePhone : null,
            badgeId: memberData.badgeId !== undefined ? memberData.badgeId : null,
          },
        })
        const key = computeCollisionKey(
          memberData.lastName,
          getMemberInitials(memberData.firstName, memberData.initials)
        )
        if (key) keysToRecompute.add(key)

        insertedCount++
      }

      if (keysToRecompute.size > 0) {
        await this.recomputeDisplayNamesByKeys(
          tx as unknown as PrismaClientInstance,
          keysToRecompute
        )
      }

      return insertedCount
    })

    await this.invalidatePresenceCache()
    return result
  }

  /**
   * Bulk update members (for import operations)
   */
  async bulkUpdate(updates: Array<{ id: string } & UpdateMemberInput>): Promise<number> {
    if (updates.length === 0) {
      return 0
    }

    const uniqueRankCodes = [
      ...new Set(
        updates
          .map((update) => update.rank)
          .filter((rank): rank is string => rank !== undefined && rank !== null)
      ),
    ]
    const rankMap = new Map<string, string>()
    if (uniqueRankCodes.length > 0) {
      const ranks = await Promise.all(
        uniqueRankCodes.map(async (code) => {
          const rank = await this.rankRepository.findByCode(code)
          if (!rank) {
            throw new Error(`Invalid rank code: ${code}`)
          }
          return rank
        })
      )

      for (const rank of ranks) {
        rankMap.set(rank.code, rank.id)
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let updatedCount = 0
      const keysToRecompute = new Set<string>()
      const identity = await getSentinelBootstrapIdentity(this.prisma)

      for (const update of updates) {
        const { id, ...data } = update
        if (identity && identity.memberId === id) {
          throw new Error('Cannot modify the protected Sentinel bootstrap member')
        }

        const existing = await tx.member.findUnique({
          where: { id },
          select: { lastName: true, firstName: true, initials: true },
        })
        if (existing) {
          const oldKey = this.getDisplayKeyForMember(existing)
          if (oldKey) keysToRecompute.add(oldKey)
        }
        const updateData: Record<string, unknown> = {}

        if (data.serviceNumber !== undefined) {
          updateData.serviceNumber = data.serviceNumber
        }
        if (data.employeeNumber !== undefined) {
          updateData.employeeNumber = data.employeeNumber
        }
        if (data.firstName !== undefined) {
          updateData.firstName = data.firstName
        }
        if (data.lastName !== undefined) {
          updateData.lastName = data.lastName
        }
        if (data.initials !== undefined) {
          updateData.initials = data.initials
        }
        if (data.rank !== undefined) {
          updateData.rank = data.rank
          const rankId = rankMap.get(data.rank)
          if (!rankId) {
            throw new Error(`Invalid rank code: ${data.rank}`)
          }
          updateData.rankId = rankId
        }
        if (data.divisionId !== undefined) {
          updateData.divisionId = data.divisionId
        }
        if (data.mess !== undefined) {
          updateData.mess = data.mess
        }
        if (data.moc !== undefined) {
          updateData.moc = data.moc
        }
        if (data.memberType !== undefined) {
          updateData.memberType = data.memberType
        }
        if (data.memberTypeId !== undefined) {
          updateData.memberTypeId = data.memberTypeId
        }
        if (data.classDetails !== undefined) {
          updateData.classDetails = data.classDetails
        }
        if (data.status !== undefined) {
          updateData.status = data.status
        }
        if (data.email !== undefined) {
          updateData.email = data.email
        }
        if (data.homePhone !== undefined) {
          updateData.homePhone = data.homePhone
        }
        if (data.mobilePhone !== undefined) {
          updateData.mobilePhone = data.mobilePhone
        }
        if (data.badgeId !== undefined) {
          updateData.badgeId = data.badgeId
        }

        if (Object.keys(updateData).length === 0) {
          continue // Skip if no fields to update
        }

        await tx.member.update({
          where: { id },
          data: updateData,
        })

        const newKey = computeCollisionKey(
          data.lastName ?? existing?.lastName,
          getMemberInitials(
            data.firstName ?? existing?.firstName,
            data.initials ?? existing?.initials
          )
        )
        if (newKey) keysToRecompute.add(newKey)

        updatedCount++
      }

      if (keysToRecompute.size > 0) {
        await this.recomputeDisplayNamesByKeys(
          tx as unknown as PrismaClientInstance,
          keysToRecompute
        )
      }

      return updatedCount
    })

    await this.invalidatePresenceCache()
    return result
  }

  /**
   * Flag members for review (set status to pending_review)
   */
  async flagForReview(memberIds: string[]): Promise<void> {
    if (memberIds.length === 0) {
      return
    }

    const identity = await getSentinelBootstrapIdentity(this.prisma)
    if (identity && memberIds.includes(identity.memberId)) {
      throw new Error('Cannot modify the protected Sentinel bootstrap member')
    }

    await this.prisma.member.updateMany({
      where: {
        id: { in: memberIds },
      },
      data: {
        status: 'pending_review',
      },
    })

    await this.invalidatePresenceCache()
  }

  /**
   * Add a tag to a member
   */
  async addTag(memberId: string, tagId: string): Promise<void> {
    await this.prisma.memberTag.createMany({
      data: {
        memberId,
        tagId,
      },
      skipDuplicates: true,
    })
  }

  /**
   * Remove a tag from a member
   */
  async removeTag(memberId: string, tagId: string): Promise<void> {
    await this.prisma.memberTag.deleteMany({
      where: {
        memberId,
        tagId,
      },
    })
  }

  /**
   * Clear badge reference from any member that has this badgeId
   * Used to clean up orphaned references when badge is unassigned
   */
  async clearBadgeReference(badgeId: string): Promise<void> {
    await this.prisma.member.updateMany({
      where: { badgeId },
      data: { badgeId: null },
    })
  }

  /**
   * Invalidate presence cache
   * TODO: Implement Redis caching in Phase 2
   */
  private async invalidatePresenceCache(): Promise<void> {
    // Redis cache invalidation will be implemented in Phase 2
    // For now, this is a no-op
  }
}

export const memberRepository = new MemberRepository()
