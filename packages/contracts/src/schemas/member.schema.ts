import * as v from 'valibot'

/**
 * Member rank code validation schema
 * Validates that rank code is a valid string (actual validation happens at API level)
 */
export const RankCodeSchema = v.pipe(
  v.string('Rank code is required'),
  v.minLength(1, 'Rank code must not be empty'),
  v.maxLength(10, 'Rank code must be at most 10 characters')
)

/**
 * Create member request schema
 */
export const CreateMemberSchema = v.object({
  serviceNumber: v.pipe(
    v.string('Service number is required'),
    v.minLength(6, 'Service number must be at least 6 characters'),
    v.maxLength(20, 'Service number must be at most 20 characters')
  ),
  rank: RankCodeSchema,
  firstName: v.pipe(
    v.string('First name is required'),
    v.minLength(1, 'First name cannot be empty'),
    v.maxLength(100, 'First name must be at most 100 characters')
  ),
  lastName: v.pipe(
    v.string('Last name is required'),
    v.minLength(1, 'Last name cannot be empty'),
    v.maxLength(100, 'Last name must be at most 100 characters')
  ),
  middleInitial: v.optional(
    v.pipe(v.string(), v.maxLength(5, 'Middle initial must be at most 5 characters'))
  ),
  divisionId: v.pipe(v.string('Division is required'), v.uuid('Invalid division ID')),
  email: v.optional(v.pipe(v.string(), v.email('Invalid email address'))),
  phoneNumber: v.optional(v.string()),
  memberTypeId: v.optional(v.pipe(v.string(), v.uuid('Invalid member type ID'))),
  memberStatusId: v.optional(v.pipe(v.string(), v.uuid('Invalid member status ID'))),
  badgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
})

/**
 * Update member request schema (all fields optional except ID)
 */
export const UpdateMemberSchema = v.object({
  serviceNumber: v.optional(
    v.pipe(
      v.string(),
      v.minLength(6, 'Service number must be at least 6 characters'),
      v.maxLength(20, 'Service number must be at most 20 characters')
    )
  ),
  rank: v.optional(RankCodeSchema),
  firstName: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'First name cannot be empty'),
      v.maxLength(100, 'First name must be at most 100 characters')
    )
  ),
  lastName: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Last name cannot be empty'),
      v.maxLength(100, 'Last name must be at most 100 characters')
    )
  ),
  middleInitial: v.optional(
    v.pipe(v.string(), v.maxLength(5, 'Middle initial must be at most 5 characters'))
  ),
  divisionId: v.optional(v.pipe(v.string(), v.uuid('Invalid division ID'))),
  email: v.optional(v.pipe(v.string(), v.email('Invalid email address'))),
  phoneNumber: v.optional(v.string()),
  memberTypeId: v.optional(v.pipe(v.string(), v.uuid('Invalid member type ID'))),
  memberStatusId: v.optional(v.pipe(v.string(), v.uuid('Invalid member status ID'))),
  badgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
})

/**
 * Member qualification summary for list views
 */
export const MemberQualificationSummarySchema = v.object({
  code: v.string(),
  name: v.string(),
  chipVariant: v.optional(v.string()),
  chipColor: v.optional(v.string()),
  tagId: v.optional(v.nullable(v.string())),
})

/**
 * Member tag summary for list views
 */
export const MemberTagSummarySchema = v.object({
  id: v.string(),
  name: v.string(),
  chipVariant: v.string(),
  chipColor: v.string(),
})

/**
 * Badge status summary for member list views
 */
export const BadgeStatusSummarySchema = v.object({
  name: v.string(),
  chipVariant: v.string(),
  chipColor: v.string(),
})

/**
 * Member response schema
 */
export const MemberResponseSchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  rank: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  middleInitial: v.nullable(v.string()),
  email: v.nullable(v.string()),
  phoneNumber: v.nullable(v.string()),
  divisionId: v.string(),
  badgeId: v.nullable(v.string()),
  badgeStatus: v.optional(BadgeStatusSummarySchema),
  memberTypeId: v.nullable(v.string()),
  memberStatusId: v.nullable(v.string()),
  qualifications: v.optional(v.array(MemberQualificationSummarySchema)),
  tags: v.optional(v.array(MemberTagSummarySchema)),
  missedCheckoutCount: v.optional(v.number()),
  lastMissedCheckout: v.optional(v.nullable(v.string())),
  createdAt: v.string(),
  updatedAt: v.nullable(v.string()),
})

/**
 * Member list query parameters
 */
export const MemberListQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(500))
  ),
  search: v.optional(v.string()),
  divisionId: v.optional(v.pipe(v.string(), v.uuid())),
  rank: v.optional(v.string()),
  status: v.optional(v.string()),
  qualificationCode: v.optional(v.string()),
  includeHidden: v.optional(v.pipe(v.string(), v.transform((s) => s === 'true'))),
})

/**
 * Member list response schema
 */
export const MemberListResponseSchema = v.object({
  members: v.array(MemberResponseSchema),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
})

/**
 * Type exports
 */
export type CreateMemberInput = v.InferOutput<typeof CreateMemberSchema>
export type UpdateMemberInput = v.InferOutput<typeof UpdateMemberSchema>
export type MemberResponse = v.InferOutput<typeof MemberResponseSchema>
export type MemberListQuery = v.InferOutput<typeof MemberListQuerySchema>
export type MemberListResponse = v.InferOutput<typeof MemberListResponseSchema>
