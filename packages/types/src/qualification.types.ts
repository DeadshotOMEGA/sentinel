/**
 * Qualification System Types
 *
 * Types for managing member qualifications that determine eligibility for
 * duty roles and lockup responsibility.
 */

// ============================================================================
// Qualification Type (Reference/Enum Table)
// ============================================================================

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

export type QualificationTypeCode =
  | 'DDS' // DDS Qualified - can serve as Duty Day Staff
  | 'SWK' // SWK Qualified - can serve as Senior Watchkeeper
  | 'BUILDING_AUTH' // Building Authorized - has alarm codes and building access
  | 'VAULT_KEY' // Vault Key Holder
  | 'VAULT_CODE' // Vault Code Holder
  | 'FM' // Facility Manager
  | 'ISA' // Unit Security Authority

export interface CreateQualificationTypeInput {
  code: string
  name: string
  description?: string | null
  canReceiveLockup?: boolean
  displayOrder?: number
}

// ============================================================================
// Member Qualification (Join Table with Audit)
// ============================================================================

export type QualificationStatus = 'active' | 'expired' | 'revoked'

export interface MemberQualification {
  id: string
  memberId: string
  qualificationTypeId: string
  status: QualificationStatus
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

export interface MemberQualificationWithType extends MemberQualification {
  qualificationType: QualificationType
}

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

export interface GrantQualificationInput {
  memberId: string
  qualificationTypeId: string
  grantedBy?: string | null
  expiresAt?: Date | null
  notes?: string | null
}

export interface RevokeQualificationInput {
  qualificationId: string
  revokedBy?: string | null
  revokeReason?: string | null
}

// ============================================================================
// Lockup Eligibility
// ============================================================================

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

export interface LockupEligibilityResult {
  memberId: string
  canReceiveLockup: boolean
  reasons: string[]
  eligibleQualifications: QualificationType[]
}
