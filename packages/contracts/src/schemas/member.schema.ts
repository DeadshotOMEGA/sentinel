import * as v from 'valibot'

/**
 * Member rank values
 */
export const RankEnum = v.picklist([
  'AB',
  'OS',
  'S3',
  'S2',
  'S1',
  'MS',
  'PO2',
  'PO1',
  'CPO2',
  'CPO1',
])

/**
 * Create member request schema
 */
export const CreateMemberSchema = v.object({
  serviceNumber: v.pipe(
    v.string('Service number is required'),
    v.minLength(6, 'Service number must be at least 6 characters'),
    v.maxLength(20, 'Service number must be at most 20 characters')
  ),
  rank: RankEnum,
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
  rank: v.optional(RankEnum),
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
  memberTypeId: v.nullable(v.string()),
  memberStatusId: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.nullable(v.string()),
})

/**
 * Member list query parameters
 */
export const MemberListQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))),
  search: v.optional(v.string()),
  divisionId: v.optional(v.pipe(v.string(), v.uuid())),
  rank: v.optional(v.string()),
  status: v.optional(v.string()),
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
