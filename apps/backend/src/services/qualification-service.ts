import { QualificationRepository } from '../repositories/qualification-repository.js'
import type {
  QualificationType,
  MemberQualificationWithType,
  MemberQualificationWithDetails,
  GrantQualificationInput,
  LockupEligibleMember,
} from '../repositories/qualification-repository.js'
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

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
    this.repository = new QualificationRepository(prisma)
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

    return this.repository.grant(input)
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

    return this.repository.revoke(qualificationId, revokedBy, revokeReason)
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
