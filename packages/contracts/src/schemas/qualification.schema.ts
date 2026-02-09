import * as v from 'valibot'

// ============================================================================
// Qualification Type Schemas
// ============================================================================

/**
 * Tag info embedded in qualification type response
 */
export const QualificationTypeTagSchema = v.object({
  id: v.string(),
  name: v.string(),
  chipVariant: v.string(),
  chipColor: v.string(),
})

/**
 * Qualification type response schema
 */
export const QualificationTypeResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  canReceiveLockup: v.boolean(),
  isAutomatic: v.boolean(),
  displayOrder: v.number(),
  tagId: v.nullable(v.string()),
  tag: v.nullable(QualificationTypeTagSchema),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * List of qualification types
 */
export const QualificationTypeListResponseSchema = v.object({
  data: v.array(QualificationTypeResponseSchema),
})

/**
 * Single qualification type response (for create/update)
 */
export const SingleQualificationTypeResponseSchema = v.object({
  qualificationType: QualificationTypeResponseSchema,
})

/**
 * Qualification type ID path param
 */
export const QualificationTypeIdParamSchema = v.object({
  id: v.pipe(
    v.string('Qualification type ID is required'),
    v.uuid('Invalid qualification type ID format')
  ),
})

/**
 * Code validation pattern - lowercase alphanumeric with underscores only
 */
const QualificationCodePattern = /^[A-Z0-9_]+$/

/**
 * Create qualification type input schema
 */
export const CreateQualificationTypeSchema = v.object({
  code: v.pipe(
    v.string('Code is required'),
    v.minLength(1, 'Code cannot be empty'),
    v.maxLength(50, 'Code must be at most 50 characters'),
    v.regex(QualificationCodePattern, 'Code must be uppercase alphanumeric with underscores only')
  ),
  name: v.pipe(
    v.string('Name is required'),
    v.minLength(1, 'Name cannot be empty'),
    v.maxLength(100, 'Name must be at most 100 characters')
  ),
  description: v.optional(
    v.nullable(v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters')))
  ),
  canReceiveLockup: v.optional(v.boolean()),
  isAutomatic: v.optional(v.boolean()),
  displayOrder: v.optional(v.number()),
  tagId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid tag ID format')))),
})

/**
 * Update qualification type input schema (all fields optional)
 */
export const UpdateQualificationTypeSchema = v.object({
  code: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Code cannot be empty'),
      v.maxLength(50, 'Code must be at most 50 characters'),
      v.regex(QualificationCodePattern, 'Code must be uppercase alphanumeric with underscores only')
    )
  ),
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Name cannot be empty'),
      v.maxLength(100, 'Name must be at most 100 characters')
    )
  ),
  description: v.optional(
    v.nullable(v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters')))
  ),
  canReceiveLockup: v.optional(v.boolean()),
  isAutomatic: v.optional(v.boolean()),
  displayOrder: v.optional(v.number()),
  tagId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid tag ID format')))),
})

// ============================================================================
// Member Qualification Schemas
// ============================================================================

/**
 * Qualification status enum
 */
export const QualificationStatusSchema = v.picklist(['active', 'expired', 'revoked'])

/**
 * Member qualification response schema
 */
export const MemberQualificationResponseSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  qualificationTypeId: v.string(),
  status: QualificationStatusSchema,
  grantedAt: v.string(),
  grantedBy: v.nullable(v.string()),
  expiresAt: v.nullable(v.string()),
  revokedAt: v.nullable(v.string()),
  revokedBy: v.nullable(v.string()),
  revokeReason: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  qualificationType: QualificationTypeResponseSchema,
})

/**
 * Member qualification with details (including member info)
 */
export const MemberQualificationWithDetailsResponseSchema = v.object({
  ...MemberQualificationResponseSchema.entries,
  member: v.optional(
    v.object({
      id: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      rank: v.string(),
      serviceNumber: v.string(),
    })
  ),
  grantedByAdmin: v.optional(
    v.nullable(
      v.object({
        id: v.string(),
        displayName: v.string(),
      })
    )
  ),
  revokedByAdmin: v.optional(
    v.nullable(
      v.object({
        id: v.string(),
        displayName: v.string(),
      })
    )
  ),
})

/**
 * List of member qualifications
 */
export const MemberQualificationListResponseSchema = v.object({
  data: v.array(MemberQualificationResponseSchema),
})

/**
 * Grant qualification input schema
 */
export const GrantQualificationInputSchema = v.object({
  qualificationTypeId: v.pipe(
    v.string('Qualification type ID is required'),
    v.uuid('Invalid qualification type ID format')
  ),
  expiresAt: v.optional(
    v.nullable(v.pipe(v.string(), v.isoTimestamp('Invalid expiration date format')))
  ),
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Revoke qualification input schema
 */
export const RevokeQualificationInputSchema = v.object({
  revokeReason: v.optional(v.nullable(v.string())),
})

// ============================================================================
// Lockup Eligibility Schemas
// ============================================================================

/**
 * Lockup eligible member response
 */
export const LockupEligibleMemberResponseSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  serviceNumber: v.string(),
  isCheckedIn: v.boolean(),
  qualifications: v.array(
    v.object({
      code: v.string(),
      name: v.string(),
    })
  ),
})

/**
 * List of lockup eligible members
 */
export const LockupEligibleMembersResponseSchema = v.object({
  data: v.array(LockupEligibleMemberResponseSchema),
})

/**
 * Lockup eligibility check query params
 */
export const LockupEligibilityQuerySchema = v.object({
  checkedInOnly: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => val === 'true')
    )
  ),
})

/**
 * Member ID path param
 */
export const MemberIdParamSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID format')),
})

/**
 * Qualification ID path param
 */
export const QualificationIdParamSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID format')),
  qualificationId: v.pipe(
    v.string('Qualification ID is required'),
    v.uuid('Invalid qualification ID format')
  ),
})

// ============================================================================
// Auto-Qualification Sync Schemas
// ============================================================================

/**
 * Result of a bulk auto-qualification sync
 */
export const AutoQualSyncResultSchema = v.object({
  granted: v.number(),
  revoked: v.number(),
  unchanged: v.number(),
  errors: v.array(
    v.object({
      memberId: v.string(),
      memberName: v.string(),
      error: v.string(),
    })
  ),
})

/**
 * Result of syncing auto-qualifications for a single member
 */
export const MemberAutoQualSyncResultSchema = v.object({
  memberId: v.string(),
  granted: v.array(v.string()),
  revoked: v.array(v.string()),
  unchanged: v.array(v.string()),
})

// ============================================================================
// Type Exports
// ============================================================================

export type AutoQualSyncResult = v.InferOutput<typeof AutoQualSyncResultSchema>
export type MemberAutoQualSyncResult = v.InferOutput<typeof MemberAutoQualSyncResultSchema>
export type QualificationTypeResponse = v.InferOutput<typeof QualificationTypeResponseSchema>
export type QualificationTypeListResponse = v.InferOutput<
  typeof QualificationTypeListResponseSchema
>
export type QualificationStatus = v.InferOutput<typeof QualificationStatusSchema>
export type MemberQualificationResponse = v.InferOutput<typeof MemberQualificationResponseSchema>
export type MemberQualificationWithDetailsResponse = v.InferOutput<
  typeof MemberQualificationWithDetailsResponseSchema
>
export type MemberQualificationListResponse = v.InferOutput<
  typeof MemberQualificationListResponseSchema
>
export type GrantQualificationInput = v.InferOutput<typeof GrantQualificationInputSchema>
export type RevokeQualificationInput = v.InferOutput<typeof RevokeQualificationInputSchema>
export type LockupEligibleMemberResponse = v.InferOutput<typeof LockupEligibleMemberResponseSchema>
export type LockupEligibleMembersResponse = v.InferOutput<
  typeof LockupEligibleMembersResponseSchema
>
export type LockupEligibilityQuery = v.InferOutput<typeof LockupEligibilityQuerySchema>
export type MemberIdParam = v.InferOutput<typeof MemberIdParamSchema>
export type QualificationIdParam = v.InferOutput<typeof QualificationIdParamSchema>
export type QualificationTypeIdParam = v.InferOutput<typeof QualificationTypeIdParamSchema>
export type CreateQualificationType = v.InferOutput<typeof CreateQualificationTypeSchema>
export type UpdateQualificationType = v.InferOutput<typeof UpdateQualificationTypeSchema>
export type SingleQualificationTypeResponse = v.InferOutput<
  typeof SingleQualificationTypeResponseSchema
>
