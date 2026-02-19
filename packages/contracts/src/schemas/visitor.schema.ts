import * as v from 'valibot'

/**
 * Visit type values
 */
export const VisitTypeEnum = v.picklist(['contractor', 'guest', 'official', 'other'])

/**
 * Create visitor request schema
 */
export const CreateVisitorSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Visitor name cannot be empty'),
      v.maxLength(200, 'Visitor name must be at most 200 characters')
    )
  ),
  rankPrefix: v.optional(
    v.pipe(v.string(), v.maxLength(50, 'Rank/prefix must be at most 50 characters'))
  ),
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
  organization: v.optional(
    v.pipe(v.string(), v.maxLength(200, 'Organization must be at most 200 characters'))
  ),
  visitType: VisitTypeEnum,
  visitTypeId: v.optional(v.pipe(v.string(), v.uuid('Invalid visit type ID'))),
  visitReason: v.optional(v.string()),
  eventId: v.optional(v.pipe(v.string(), v.uuid('Invalid event ID'))),
  hostMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid host member ID'))),
  checkInTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid check-in time'))),
  checkOutTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid checkout time'))),
  temporaryBadgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  kioskId: v.pipe(v.string('Kiosk ID is required'), v.minLength(1, 'Kiosk ID cannot be empty')),
  adminNotes: v.optional(v.string()),
  checkInMethod: v.optional(v.picklist(['kiosk', 'admin_manual'])),
  createdByAdmin: v.optional(v.pipe(v.string(), v.uuid('Invalid admin ID'))),
})

/**
 * Update visitor request schema
 */
export const UpdateVisitorSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Visitor name cannot be empty'),
      v.maxLength(200, 'Visitor name must be at most 200 characters')
    )
  ),
  rankPrefix: v.optional(
    v.pipe(v.string(), v.maxLength(50, 'Rank/prefix must be at most 50 characters'))
  ),
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
  organization: v.optional(
    v.pipe(v.string(), v.maxLength(200, 'Organization must be at most 200 characters'))
  ),
  visitType: v.optional(VisitTypeEnum),
  visitTypeId: v.optional(v.pipe(v.string(), v.uuid('Invalid visit type ID'))),
  visitReason: v.optional(v.string()),
  eventId: v.optional(v.pipe(v.string(), v.uuid('Invalid event ID'))),
  hostMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid host member ID'))),
  checkInTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid check-in time'))),
  checkOutTime: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid checkout time'))),
  temporaryBadgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  kioskId: v.optional(v.pipe(v.string(), v.minLength(1, 'Kiosk ID cannot be empty'))),
  adminNotes: v.optional(v.string()),
  checkInMethod: v.optional(v.picklist(['kiosk', 'admin_manual'])),
})

/**
 * Visitor response schema
 */
export const VisitorResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  rankPrefix: v.nullable(v.string()),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  displayName: v.string(),
  organization: v.nullable(v.string()),
  visitType: VisitTypeEnum,
  visitTypeId: v.nullable(v.string()),
  visitReason: v.nullable(v.string()),
  eventId: v.nullable(v.string()),
  hostMemberId: v.nullable(v.string()),
  checkInTime: v.string(),
  checkOutTime: v.nullable(v.string()),
  temporaryBadgeId: v.nullable(v.string()),
  kioskId: v.string(),
  adminNotes: v.nullable(v.string()),
  checkInMethod: v.picklist(['kiosk', 'admin_manual']),
  createdByAdmin: v.nullable(v.string()),
  createdAt: v.string(),
})

/**
 * Visitor list query schema
 */
export const VisitorListQuerySchema = v.object({
  startDate: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid start date'))),
  endDate: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid end date'))),
  visitType: v.optional(VisitTypeEnum),
  hostMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid host member ID'))),
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
})

/**
 * Visitor list response schema
 */
export const VisitorListResponseSchema = v.object({
  visitors: v.array(VisitorResponseSchema),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
})

/**
 * Active visitors response schema
 */
export const ActiveVisitorsResponseSchema = v.object({
  visitors: v.array(VisitorResponseSchema),
  count: v.number(),
})

/**
 * Checkout response schema
 */
export const CheckoutResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  visitor: VisitorResponseSchema,
})

// Type exports
export type CreateVisitorInput = v.InferOutput<typeof CreateVisitorSchema>
export type UpdateVisitorInput = v.InferOutput<typeof UpdateVisitorSchema>
export type VisitorResponse = v.InferOutput<typeof VisitorResponseSchema>
export type VisitorListQuery = v.InferOutput<typeof VisitorListQuerySchema>
export type VisitorListResponse = v.InferOutput<typeof VisitorListResponseSchema>
export type ActiveVisitorsResponse = v.InferOutput<typeof ActiveVisitorsResponseSchema>
export type CheckoutResponse = v.InferOutput<typeof CheckoutResponseSchema>
