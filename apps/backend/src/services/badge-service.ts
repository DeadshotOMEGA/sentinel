import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'
import type {
  Badge,
  CreateBadgeInput,
  BadgeStatus,
  BadgeAssignmentType,
  MemberWithDivision,
} from '@sentinel/types'
import { broadcastBadgeAssignment } from '../websocket/broadcast.js'

interface BadgeFilters {
  status?: BadgeStatus
  assignmentType?: BadgeAssignmentType
}

interface BadgeValidationResult {
  badge: Badge
  member: MemberWithDivision
}

export class BadgeService {
  private badgeRepo: BadgeRepository
  private memberRepo: MemberRepository

  constructor(prismaClient?: PrismaClient) {
    const prisma = prismaClient || getPrismaClient()
    this.badgeRepo = new BadgeRepository(prisma)
    this.memberRepo = new MemberRepository(prisma)
  }

  /**
   * Find badge by ID
   */
  async findById(id: string): Promise<Badge | null> {
    return this.badgeRepo.findById(id)
  }

  /**
   * Find badge by serial number
   */
  async findBySerialNumber(serialNumber: string): Promise<Badge | null> {
    return this.badgeRepo.findBySerialNumber(serialNumber)
  }

  /**
   * Find all badges with optional filters
   */
  async findAll(filters?: BadgeFilters): Promise<Badge[]> {
    return this.badgeRepo.findAll(filters)
  }

  /**
   * Find badge by serial number with assigned member details
   */
  async findWithMember(
    serialNumber: string
  ): Promise<{ badge: Badge; member: MemberWithDivision | null } | null> {
    return this.badgeRepo.findBySerialNumberWithMember(serialNumber)
  }

  /**
   * Create a new badge
   */
  async create(data: CreateBadgeInput): Promise<Badge> {
    // Validate serial number is provided
    if (!data.serialNumber) {
      throw new ValidationError('Serial number required')
    }

    // Check if serial number already exists
    const existing = await this.badgeRepo.findBySerialNumber(data.serialNumber)
    if (existing) {
      throw new ConflictError(
        `Badge with serial number ${data.serialNumber} already exists`
      )
    }

    // Create badge with explicit defaults
    const badge = await this.badgeRepo.create({
      serialNumber: data.serialNumber,
      status: data.status !== undefined ? data.status : 'active',
      assignmentType: 'unassigned',
      assignedToId: undefined,
    })

    return badge
  }

  /**
   * Assign badge to member
   */
  async assign(badgeId: string, memberId: string): Promise<Badge> {
    // Verify badge exists
    const badge = await this.badgeRepo.findById(badgeId)
    if (!badge) {
      throw new NotFoundError('Badge', badgeId)
    }

    // Check if badge is already assigned
    if (badge.assignmentType !== 'unassigned' && badge.assignedToId) {
      throw new ConflictError(`Badge is already assigned to ${badge.assignedToId}`)
    }

    // Verify member exists
    const member = await this.memberRepo.findById(memberId)
    if (!member) {
      throw new NotFoundError('Member', memberId)
    }

    // Check if member already has a badge assigned
    if (member.badgeId) {
      throw new ConflictError(`Member already has badge ${member.badgeId} assigned`)
    }

    // Assign badge to member
    const updatedBadge = await this.badgeRepo.assign(badgeId, memberId, 'member')

    // Update member record with badge ID
    await this.memberRepo.update(memberId, { badgeId })

    // Broadcast badge assignment
    broadcastBadgeAssignment({
      badgeId: updatedBadge.id,
      serialNumber: updatedBadge.serialNumber,
      assignmentType: 'member',
      assignedToId: memberId,
      assignedToName: `${member.firstName} ${member.lastName}`,
      timestamp: new Date().toISOString(),
    })

    return updatedBadge
  }

  /**
   * Unassign badge
   */
  async unassign(badgeId: string): Promise<Badge> {
    // Verify badge exists
    const badge = await this.badgeRepo.findById(badgeId)
    if (!badge) {
      throw new NotFoundError('Badge', badgeId)
    }

    // Clean up any member that has this badge assigned (handles orphaned references)
    // First try badge.assignedToId, then search by badgeId directly
    if (badge.assignedToId) {
      const member = await this.memberRepo.findById(badge.assignedToId)
      if (member && member.badgeId === badgeId) {
        await this.memberRepo.update(badge.assignedToId, { badgeId: null })
      }
    }

    // Also clear any orphaned member references (badge unassigned but member still has badgeId)
    await this.memberRepo.clearBadgeReference(badgeId)

    // If badge is already unassigned, just return it (cleanup above still runs)
    if (badge.assignmentType === 'unassigned') {
      return badge
    }

    // Unassign badge
    const updatedBadge = await this.badgeRepo.unassign(badgeId)

    // Broadcast badge unassignment
    broadcastBadgeAssignment({
      badgeId: updatedBadge.id,
      serialNumber: updatedBadge.serialNumber,
      assignmentType: 'unassigned',
      assignedToId: null,
      assignedToName: undefined,
      timestamp: new Date().toISOString(),
    })

    return updatedBadge
  }

  /**
   * Update badge status
   * Auto-unassigns badge when marked as 'returned'
   * Lost and disabled badges remain assigned to track who had them
   */
  async updateStatus(badgeId: string, status: BadgeStatus): Promise<Badge> {
    // Verify badge exists
    const badge = await this.badgeRepo.findById(badgeId)
    if (!badge) {
      throw new NotFoundError('Badge', badgeId)
    }

    // Auto-unassign when marking as 'returned'
    if (status === 'returned' && badge.assignmentType !== 'unassigned') {
      await this.unassign(badgeId)
    }

    // Update status
    const updatedBadge = await this.badgeRepo.updateStatus(badgeId, status)

    return updatedBadge
  }

  /**
   * Validate badge for check-in
   * Returns badge and member if valid, throws specific errors otherwise
   */
  async validateForCheckin(serialNumber: string): Promise<BadgeValidationResult> {
    // Find badge by serial number with member data
    const result = await this.badgeRepo.findBySerialNumberWithMember(serialNumber)

    if (!result) {
      throw new NotFoundError('Badge', serialNumber)
    }

    const { badge, member } = result

    // Check if badge is assigned
    if (badge.assignmentType !== 'member' || !badge.assignedToId) {
      throw new ValidationError(`Badge ${serialNumber} is not assigned to a member`)
    }

    // Check badge status
    if (badge.status === 'lost') {
      throw new ValidationError(`Badge ${serialNumber} has been reported lost`)
    }

    if (badge.status === 'disabled') {
      throw new ValidationError(`Badge ${serialNumber} has been disabled`)
    }

    if (badge.status === 'returned') {
      throw new ValidationError(`Badge ${serialNumber} has been returned`)
    }

    if (badge.status !== 'active') {
      throw new ValidationError(`Badge ${serialNumber} status is ${badge.status}`)
    }

    // Verify member data exists (should always be present if badge is assigned to member)
    if (!member) {
      throw new NotFoundError('Member', badge.assignedToId)
    }

    // Check member status
    if (member.status !== 'active') {
      throw new ValidationError(
        `Member ${member.firstName} ${member.lastName} status is ${member.status}`
      )
    }

    // Return validated badge and member
    return {
      badge,
      member,
    }
  }
}

export const badgeService = new BadgeService()
