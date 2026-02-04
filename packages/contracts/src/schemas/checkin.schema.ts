import * as v from 'valibot'

/**
 * Checkin direction enum
 */
export const CheckinDirectionEnum = v.picklist(['in', 'out'])

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
  type: v.optional(v.picklist(['member', 'visitor'])),
  visitorName: v.optional(v.string()),
  visitorOrganization: v.optional(v.string()),
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
  flaggedOnly: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => val === 'true')
    )
  ),
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
 * Present person schema (unified member + visitor for dashboard)
 */
export const PresentPersonSchema = v.object({
  id: v.string(),
  type: v.picklist(['member', 'visitor']),
  name: v.string(),
  rank: v.optional(v.string()),
  rankSortOrder: v.optional(v.number()),
  division: v.optional(v.string()),
  divisionId: v.optional(v.string()),
  memberType: v.optional(v.string()),
  tags: v.optional(
    v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        chipVariant: v.optional(v.string()),
        chipColor: v.optional(v.string()),
      })
    )
  ),
  organization: v.optional(v.string()),
  visitType: v.optional(
    v.object({
      id: v.string(),
      name: v.string(),
      chipVariant: v.optional(v.string()),
      chipColor: v.optional(v.string()),
    })
  ),
  visitReason: v.optional(v.string()),
  hostMemberId: v.optional(v.string()),
  hostName: v.optional(v.string()),
  eventId: v.optional(v.string()),
  eventName: v.optional(v.string()),
  checkInTime: v.string(),
  kioskId: v.optional(v.string()),
  kioskName: v.optional(v.string()),
  alerts: v.optional(
    v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        message: v.string(),
      })
    )
  ),
})

/**
 * Present people response schema
 */
export const PresentPeopleResponseSchema = v.object({
  people: v.array(PresentPersonSchema),
  total: v.number(),
})

/**
 * Recent activity item schema (unified checkin + visitor events)
 */
export const RecentActivityItemSchema = v.object({
  type: v.picklist(['checkin', 'visitor']),
  id: v.string(),
  timestamp: v.string(),
  direction: v.picklist(['in', 'out']),
  name: v.string(),
  rank: v.optional(v.string()),
  division: v.optional(v.string()),
  kioskId: v.optional(v.string()),
  kioskName: v.optional(v.string()),
  organization: v.optional(v.string()),
  visitType: v.optional(v.string()),
  visitReason: v.optional(v.string()),
  hostName: v.optional(v.string()),
  eventId: v.optional(v.string()),
  eventName: v.optional(v.string()),
})

/**
 * Recent activity response schema
 */
export const RecentActivityResponseSchema = v.object({
  activities: v.array(RecentActivityItemSchema),
  total: v.number(),
})

/**
 * Recent activity query schema
 */
export const RecentActivityQuerySchema = v.object({
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
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
export type PresentPerson = v.InferOutput<typeof PresentPersonSchema>
export type PresentPeopleResponse = v.InferOutput<typeof PresentPeopleResponseSchema>
export type RecentActivityItem = v.InferOutput<typeof RecentActivityItemSchema>
export type RecentActivityResponse = v.InferOutput<typeof RecentActivityResponseSchema>
export type RecentActivityQuery = v.InferOutput<typeof RecentActivityQuerySchema>
