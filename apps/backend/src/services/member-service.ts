import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'
import type {
  Member,
  MemberWithDivision,
  CreateMemberInput,
  UpdateMemberInput,
  MemberFilterParams,
  Checkin,
} from '@sentinel/types'

export interface PresenceStatusResult {
  isPresent: boolean
  lastCheckin?: Checkin
}

/**
 * Service for member lifecycle management
 * Handles creation, updates, deactivation, and badge assignment
 */
export class MemberService {
  private memberRepo: MemberRepository
  private badgeRepo: BadgeRepository
  private checkinRepo: CheckinRepository

  constructor(prismaClient?: PrismaClient) {
    const prisma = prismaClient || getPrismaClient()
    this.memberRepo = new MemberRepository(prisma)
    this.badgeRepo = new BadgeRepository(prisma)
    this.checkinRepo = new CheckinRepository(prisma)
  }

  /**
   * Find member by ID with division
   */
  async findById(id: string): Promise<MemberWithDivision | null> {
    if (!id || id.trim() === '') {
      throw new ValidationError('Member ID cannot be empty')
    }

    return this.memberRepo.findById(id)
  }

  /**
   * Find member by service number
   */
  async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
    if (!serviceNumber || serviceNumber.trim() === '') {
      throw new ValidationError('Service number cannot be empty')
    }

    return this.memberRepo.findByServiceNumber(serviceNumber)
  }

  /**
   * Find all members with optional filters
   */
  async findAll(filters?: MemberFilterParams): Promise<MemberWithDivision[]> {
    return this.memberRepo.findAll(filters)
  }

  /**
   * Find paginated members with optional filters
   */
  async findPaginated(params: {
    page: number
    limit: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: MemberFilterParams
  }): Promise<{
    members: MemberWithDivision[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    // Validate pagination parameters
    if (!params.page || params.page < 1) {
      throw new ValidationError('Page must be >= 1')
    }

    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100')
    }

    const { members, total } = await this.memberRepo.findPaginated(
      {
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
      params.filters
    )

    const totalPages = Math.ceil(total / params.limit)

    return {
      members,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
    }
  }

  /**
   * Create a new member
   */
  async create(data: CreateMemberInput): Promise<Member> {
    // Validate required fields
    if (!data.serviceNumber || data.serviceNumber.trim() === '') {
      throw new ValidationError('Service number is required')
    }

    if (!data.firstName || data.firstName.trim() === '') {
      throw new ValidationError('First name is required')
    }

    if (!data.lastName || data.lastName.trim() === '') {
      throw new ValidationError('Last name is required')
    }

    if (!data.rank || data.rank.trim() === '') {
      throw new ValidationError('Rank is required')
    }

    if (!data.divisionId || data.divisionId.trim() === '') {
      throw new ValidationError('Division is required')
    }

    // Check if service number already exists
    const existing = await this.memberRepo.findByServiceNumber(data.serviceNumber)
    if (existing) {
      throw new ConflictError(`Service number ${data.serviceNumber} is already in use`)
    }

    // If badgeId is provided, validate badge exists and is unassigned
    if (data.badgeId) {
      const badge = await this.badgeRepo.findById(data.badgeId)
      if (!badge) {
        throw new NotFoundError('Badge', data.badgeId)
      }

      if (badge.assignmentType !== 'unassigned') {
        throw new ConflictError(`Badge ${badge.serialNumber} is already assigned`)
      }
    }

    // Create member
    const member = await this.memberRepo.create(data)

    // If badge was assigned, update badge assignment
    if (data.badgeId) {
      await this.badgeRepo.assign(data.badgeId, member.id, 'member')
    }

    return member
  }

  /**
   * Update an existing member
   */
  async update(id: string, data: UpdateMemberInput): Promise<Member> {
    // Validate ID
    if (!id || id.trim() === '') {
      throw new ValidationError('Member ID cannot be empty')
    }

    // Check if member exists
    const existing = await this.memberRepo.findById(id)
    if (!existing) {
      throw new NotFoundError('Member', id)
    }

    // If updating service number, check for conflicts
    if (data.serviceNumber && data.serviceNumber !== existing.serviceNumber) {
      const conflict = await this.memberRepo.findByServiceNumber(data.serviceNumber)
      if (conflict) {
        throw new ConflictError(`Service number ${data.serviceNumber} is already in use`)
      }
    }

    // If updating badgeId, validate badge exists and is unassigned
    if (data.badgeId !== undefined && data.badgeId !== existing.badgeId) {
      if (data.badgeId) {
        const badge = await this.badgeRepo.findById(data.badgeId)
        if (!badge) {
          throw new NotFoundError('Badge', data.badgeId)
        }

        if (badge.assignmentType !== 'unassigned') {
          throw new ConflictError(`Badge ${badge.serialNumber} is already assigned`)
        }
      }

      // Unassign old badge if exists
      if (existing.badgeId) {
        await this.badgeRepo.unassign(existing.badgeId)
      }

      // Assign new badge if provided
      if (data.badgeId) {
        await this.badgeRepo.assign(data.badgeId, id, 'member')
      }
    }

    // Update member
    return this.memberRepo.update(id, data)
  }

  /**
   * Deactivate a member (soft delete - set status to inactive)
   */
  async deactivate(id: string): Promise<void> {
    // Validate ID
    if (!id || id.trim() === '') {
      throw new ValidationError('Member ID cannot be empty')
    }

    // Check if member exists
    const existing = await this.memberRepo.findById(id)
    if (!existing) {
      throw new NotFoundError('Member', id)
    }

    // Deactivate member (sets status to inactive)
    await this.memberRepo.delete(id)

    // Unassign badge if exists
    if (existing.badgeId) {
      await this.badgeRepo.unassign(existing.badgeId)
    }
  }

  /**
   * Get member's current presence status
   */
  async getPresenceStatus(id: string): Promise<PresenceStatusResult> {
    // Validate ID
    if (!id || id.trim() === '') {
      throw new ValidationError('Member ID cannot be empty')
    }

    // Check if member exists
    const member = await this.memberRepo.findById(id)
    if (!member) {
      throw new NotFoundError('Member', id)
    }

    // Get latest checkin
    const lastCheckin = await this.checkinRepo.findLatestByMember(id)

    // Determine presence based on last checkin direction
    const isPresent = lastCheckin?.direction === 'in'

    return {
      isPresent,
      lastCheckin: lastCheckin ?? undefined,
    }
  }

  /**
   * Assign a badge to a member
   */
  async assignBadge(memberId: string, badgeId: string): Promise<void> {
    // Validate IDs
    if (!memberId || memberId.trim() === '') {
      throw new ValidationError('Member ID cannot be empty')
    }

    if (!badgeId || badgeId.trim() === '') {
      throw new ValidationError('Badge ID cannot be empty')
    }

    // Check if member exists
    const member = await this.memberRepo.findById(memberId)
    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Check if badge exists
    const badge = await this.badgeRepo.findById(badgeId)
    if (!badge) {
      throw new NotFoundError('Badge', badgeId)
    }

    // Validate badge is unassigned
    if (badge.assignmentType !== 'unassigned') {
      throw new ConflictError(`Badge ${badge.serialNumber} is already assigned`)
    }

    // Unassign member's current badge if exists
    if (member.badgeId) {
      await this.badgeRepo.unassign(member.badgeId)
    }

    // Assign new badge to member
    await this.badgeRepo.assign(badgeId, memberId, 'member')

    // Update member record
    await this.memberRepo.update(memberId, { badgeId })
  }

  /**
   * Unassign badge from a member
   */
  async unassignBadge(memberId: string): Promise<void> {
    // Validate ID
    if (!memberId || memberId.trim() === '') {
      throw new ValidationError('Member ID cannot be empty')
    }

    // Check if member exists
    const member = await this.memberRepo.findById(memberId)
    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Check if member has a badge
    if (!member.badgeId) {
      throw new ValidationError(
        `Member ${member.firstName} ${member.lastName} does not have a badge assigned`
      )
    }

    // Unassign badge
    await this.badgeRepo.unassign(member.badgeId)

    // Update member record
    await this.memberRepo.update(memberId, { badgeId: null })
  }
}
