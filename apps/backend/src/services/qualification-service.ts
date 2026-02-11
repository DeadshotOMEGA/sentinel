import { QualificationRepository } from '../repositories/qualification-repository.js'
import type {
  QualificationType,
  MemberQualificationWithType,
  MemberQualificationWithDetails,
  GrantQualificationInput,
  LockupEligibleMember,
  CreateQualificationTypeInput,
  UpdateQualificationTypeInput,
} from '../repositories/qualification-repository.js'
import { AutoQualificationService } from './auto-qualification-service.js'
import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

/**
 * Service for managing member qualifications
 *
 * Handles business logic for granting, revoking, and checking qualifications
 * that determine eligibility for duty roles and lockup responsibility.
 */
export class QualificationService {
  private repository: QualificationRepository
  private prisma: PrismaClientInstance
  private autoQualService: AutoQualificationService

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.repository = new QualificationRepository(prisma)
    this.autoQualService = new AutoQualificationService(prisma)
  }

  // ============================================================================
  // Qualification Types
  // ============================================================================

  /**
   * Get all qualification types
   */
  async getAllTypes(): Promise<QualificationType[]> {
    return this.repository.findAllTypes()
  }

  /**
   * Get all qualification types that allow lockup responsibility
   */
  async getLockupEligibleTypes(): Promise<QualificationType[]> {
    return this.repository.findLockupEligibleTypes()
  }

  /**
   * Get a qualification type by ID
   */
  async getTypeById(id: string): Promise<QualificationType | null> {
    return this.repository.findTypeById(id)
  }

  /**
   * Create a new qualification type
   *
   * @throws Error if code already exists
   * @throws Error if tag not found (when tagId provided)
   */
  async createType(input: CreateQualificationTypeInput): Promise<QualificationType> {
    // Check if code already exists
    const existing = await this.repository.findTypeByCode(input.code)
    if (existing) {
      throw new Error(`Qualification type code "${input.code}" already exists`)
    }

    // Validate tag exists if provided
    if (input.tagId) {
      const tag = await this.prisma.tag.findUnique({
        where: { id: input.tagId },
        select: { id: true },
      })
      if (!tag) {
        throw new Error(`Tag not found: ${input.tagId}`)
      }
    }

    return this.repository.createType(input)
  }

  /**
   * Update a qualification type
   *
   * @throws Error if qualification type not found
   * @throws Error if code already exists (when changing code)
   * @throws Error if tag not found (when tagId provided)
   */
  async updateType(id: string, input: UpdateQualificationTypeInput): Promise<QualificationType> {
    // Verify qualification type exists
    const existing = await this.repository.findTypeById(id)
    if (!existing) {
      throw new Error(`Qualification type not found: ${id}`)
    }

    // If updating code, check for conflicts
    if (input.code && input.code !== existing.code) {
      const conflict = await this.repository.findTypeByCode(input.code)
      if (conflict) {
        throw new Error(`Qualification type code "${input.code}" already exists`)
      }
    }

    // Validate tag exists if provided (and not explicitly null)
    if (input.tagId !== undefined && input.tagId !== null) {
      const tag = await this.prisma.tag.findUnique({
        where: { id: input.tagId },
        select: { id: true },
      })
      if (!tag) {
        throw new Error(`Tag not found: ${input.tagId}`)
      }
    }

    return this.repository.updateType(id, input)
  }

  /**
   * Delete a qualification type
   *
   * @throws Error if qualification type not found
   * @throws Error if qualification type is in use by members
   */
  async deleteType(id: string): Promise<void> {
    // Verify qualification type exists
    const existing = await this.repository.findTypeById(id)
    if (!existing) {
      throw new Error(`Qualification type not found: ${id}`)
    }

    // Check if actively in use
    const usageCount = await this.repository.countMembersByType(id)
    if (usageCount > 0) {
      throw new Error(
        `Cannot delete qualification type "${existing.name}". It is assigned to ${usageCount} active member(s).`
      )
    }

    // Clean up revoked/expired member qualification records before deleting the type
    // (database onDelete: Restrict would block deletion otherwise)
    await this.repository.deleteInactiveMemberQualificationsByType(id)

    await this.repository.deleteType(id)
  }

  // ============================================================================
  // Member Qualifications
  // ============================================================================

  /**
   * Get all qualifications for a member
   */
  async getMemberQualifications(memberId: string): Promise<MemberQualificationWithType[]> {
    // Verify member exists
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new Error(`Member not found: ${memberId}`)
    }

    return this.repository.findByMemberId(memberId)
  }

  /**
   * Get active qualifications for a member
   */
  async getActiveMemberQualifications(memberId: string): Promise<MemberQualificationWithType[]> {
    return this.repository.findActiveByMemberId(memberId)
  }

  /**
   * Grant a qualification to a member
   *
   * @throws Error if member not found
   * @throws Error if qualification type not found
   * @throws Error if member already has this qualification (active)
   */
  async grantQualification(
    memberId: string,
    qualificationTypeId: string,
    grantedBy?: string,
    expiresAt?: Date | null,
    notes?: string | null
  ): Promise<MemberQualificationWithType> {
    // Verify member exists
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })

    if (!member) {
      throw new Error(`Member not found: ${memberId}`)
    }

    // Verify qualification type exists
    const qualType = await this.repository.findTypeById(qualificationTypeId)
    if (!qualType) {
      throw new Error(`Qualification type not found: ${qualificationTypeId}`)
    }

    // Check if member already has this active qualification
    const hasQual = await this.repository.memberHasQualification(memberId, qualificationTypeId)
    if (hasQual) {
      throw new Error(`Member already has active qualification: ${qualType.name}`)
    }

    const input: GrantQualificationInput = {
      memberId,
      qualificationTypeId,
      grantedBy,
      expiresAt,
      notes,
    }

    const result = await this.repository.grant(input)

    // If SWK was granted, sync auto-quals to revoke DSWK if applicable
    if (qualType.code === 'SWK') {
      try {
        await this.autoQualService.syncMember(memberId)
      } catch {
        // Non-blocking: log but don't fail the grant
      }
    }

    return result
  }

  /**
   * Revoke a qualification from a member
   *
   * @throws Error if qualification not found
   * @throws Error if qualification already revoked
   */
  async revokeQualification(
    qualificationId: string,
    revokedBy?: string,
    revokeReason?: string
  ): Promise<MemberQualificationWithType> {
    // Verify qualification exists
    const qual = await this.repository.findById(qualificationId)
    if (!qual) {
      throw new Error(`Qualification not found: ${qualificationId}`)
    }

    if (qual.status === 'revoked') {
      throw new Error('Qualification is already revoked')
    }

    // Warn if revoking an auto-managed qualification
    const qualTypeIsAutomatic = qual.qualificationType.isAutomatic
    const effectiveReason = qualTypeIsAutomatic
      ? `${revokeReason ?? ''}${revokeReason ? '. ' : ''}Note: This is an auto-managed qualification and may be re-granted on next sync.`.trim()
      : revokeReason

    const result = await this.repository.revoke(qualificationId, revokedBy, effectiveReason)

    // If SWK was revoked, sync auto-quals to grant DSWK if eligible
    if (qual.qualificationType.code === 'SWK') {
      try {
        await this.autoQualService.syncMember(qual.memberId)
      } catch {
        // Non-blocking: log but don't fail the revoke
      }
    }

    return result
  }

  /**
   * Get a qualification by ID with full details
   */
  async getQualificationById(id: string): Promise<MemberQualificationWithDetails | null> {
    return this.repository.findById(id)
  }

  // ============================================================================
  // Lockup Eligibility
  // ============================================================================

  /**
   * Check if a member can receive lockup responsibility
   *
   * A member can receive lockup if they have at least one active qualification
   * with canReceiveLockup=true (DDS Qualified, SWK Qualified, or Building Authorized).
   */
  async canMemberReceiveLockup(memberId: string): Promise<boolean> {
    // Member must have account level >= 3 (Lockup) before qualification check
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { accountLevel: true },
    })
    if (!member || member.accountLevel < 3) {
      return false
    }
    return this.repository.canMemberReceiveLockup(memberId)
  }

  /**
   * Get all members eligible to receive lockup responsibility
   *
   * @param checkedInOnly - Only include members currently checked in
   */
  async getLockupEligibleMembers(checkedInOnly = false): Promise<LockupEligibleMember[]> {
    return this.repository.findLockupEligibleMembers(checkedInOnly)
  }

  /**
   * Validate that a member can receive lockup
   *
   * @throws Error if member cannot receive lockup
   * @throws Error if member is not checked in
   */
  async validateLockupRecipient(
    memberId: string,
    requireCheckedIn = true
  ): Promise<{ valid: true; member: LockupEligibleMember }> {
    // Get eligible members
    const eligibleMembers = await this.getLockupEligibleMembers(false)
    const member = eligibleMembers.find((m) => m.id === memberId)

    if (!member) {
      throw new Error('Member is not qualified to receive lockup responsibility')
    }

    if (requireCheckedIn && !member.isCheckedIn) {
      throw new Error('Member must be checked in to receive lockup responsibility')
    }

    return { valid: true, member }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get count of active qualifications by type
   */
  async getQualificationCounts(): Promise<
    Array<{ typeCode: string; typeName: string; count: number }>
  > {
    return this.repository.countByType()
  }
}
