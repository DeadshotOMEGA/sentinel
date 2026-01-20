import * as v from 'valibot'

/**
 * Checkin direction enum
 */
export const CheckinDirectionEnum = v.picklist(['IN', 'OUT'])

/**
 * Checkin method enum
 */
export const CheckinMethodEnum = v.picklist(['badge', 'manual', 'override'])

/**
 * Create checkin request schema
 */
export const CreateCheckinSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID')),
  badgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  direction: CheckinDirectionEnum,
  kioskId: v.pipe(
    v.string('Kiosk ID is required'),
    v.minLength(1, 'Kiosk ID cannot be empty'),
    v.maxLength(50, 'Kiosk ID must be at most 50 characters')
  ),
  method: v.optional(CheckinMethodEnum),
  timestamp: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid timestamp'))),
  flaggedForReview: v.optional(v.boolean()),
  flagReason: v.optional(v.string()),
})

/**
 * Bulk create checkins schema
 */
export const BulkCreateCheckinsSchema = v.object({
  checkins: v.pipe(
    v.array(CreateCheckinSchema),
    v.minLength(1, 'At least one checkin is required'),
    v.maxLength(100, 'Cannot create more than 100 checkins at once')
  ),
})

/**
 * Update checkin request schema
 */
export const UpdateCheckinSchema = v.object({
  direction: v.optional(CheckinDirectionEnum),
  flaggedForReview: v.optional(v.boolean()),
  flagReason: v.optional(v.string()),
})

/**
 * Checkin response schema
 */
export const CheckinResponseSchema = v.object({
  id: v.string(),
  memberId: v.nullable(v.string()),
  badgeId: v.nullable(v.string()),
  direction: v.string(),
  timestamp: v.string(),
  kioskId: v.string(),
  synced: v.nullable(v.boolean()),
  flaggedForReview: v.nullable(v.boolean()),
  flagReason: v.nullable(v.string()),
  method: v.nullable(v.string()),
  createdByAdmin: v.nullable(v.string()),
  createdAt: v.nullable(v.string()),
})

/**
 * Checkin with member details response schema
 */
export const CheckinWithMemberResponseSchema = v.object({
  id: v.string(),
  memberId: v.nullable(v.string()),
  badgeId: v.nullable(v.string()),
  direction: v.string(),
  timestamp: v.string(),
  kioskId: v.string(),
  synced: v.nullable(v.boolean()),
  flaggedForReview: v.nullable(v.boolean()),
  flagReason: v.nullable(v.string()),
  method: v.nullable(v.string()),
  member: v.nullable(
    v.object({
      id: v.string(),
      serviceNumber: v.string(),
      rank: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      divisionId: v.string(),
    })
  ),
})

/**
 * Checkin list query parameters
 */
export const CheckinListQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
  memberId: v.optional(v.pipe(v.string(), v.uuid())),
  divisionId: v.optional(v.pipe(v.string(), v.uuid())),
  direction: v.optional(v.string()),
  kioskId: v.optional(v.string()),
  startDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  endDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  flaggedOnly: v.optional(v.pipe(v.string(), v.transform((val) => val === 'true'))),
})

/**
 * Checkin list response schema
 */
export const CheckinListResponseSchema = v.object({
  checkins: v.array(CheckinWithMemberResponseSchema),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
})

/**
 * Presence status response schema
 */
export const PresenceStatusResponseSchema = v.object({
  totalPresent: v.number(),
  totalMembers: v.number(),
  byDivision: v.array(
    v.object({
      divisionId: v.string(),
      divisionName: v.string(),
      present: v.number(),
      total: v.number(),
    })
  ),
  lastUpdated: v.string(),
})

/**
 * Type exports
 */
export type CreateCheckinInput = v.InferOutput<typeof CreateCheckinSchema>
export type BulkCreateCheckinsInput = v.InferOutput<typeof BulkCreateCheckinsSchema>
export type UpdateCheckinInput = v.InferOutput<typeof UpdateCheckinSchema>
export type CheckinResponse = v.InferOutput<typeof CheckinResponseSchema>
export type CheckinWithMemberResponse = v.InferOutput<typeof CheckinWithMemberResponseSchema>
export type CheckinListQuery = v.InferOutput<typeof CheckinListQuerySchema>
export type CheckinListResponse = v.InferOutput<typeof CheckinListResponseSchema>
export type PresenceStatusResponse = v.InferOutput<typeof PresenceStatusResponseSchema>
