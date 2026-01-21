import * as v from 'valibot'

/**
 * Event status values
 */
export const EventStatusEnum = v.picklist(['draft', 'active', 'completed', 'cancelled'])

/**
 * Event attendee status values
 */
export const AttendeeStatusEnum = v.picklist(['pending', 'approved', 'denied', 'checked_in'])

/**
 * Create event request schema
 */
export const CreateEventSchema = v.object({
  name: v.pipe(
    v.string('Event name is required'),
    v.minLength(1, 'Event name cannot be empty'),
    v.maxLength(200, 'Event name must be at most 200 characters')
  ),
  code: v.pipe(
    v.string('Event code is required'),
    v.minLength(1, 'Event code cannot be empty'),
    v.maxLength(50, 'Event code must be at most 50 characters')
  ),
  description: v.optional(v.string()),
  startDate: v.pipe(v.string('Start date is required'), v.isoTimestamp('Invalid start date')),
  endDate: v.pipe(v.string('End date is required'), v.isoTimestamp('Invalid end date')),
  status: v.optional(EventStatusEnum),
  autoExpireBadges: v.optional(v.boolean()),
  customRoles: v.optional(v.record(v.string(), v.unknown())),
  createdBy: v.optional(v.pipe(v.string(), v.uuid('Invalid admin ID'))),
})

/**
 * Update event request schema
 */
export const UpdateEventSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Event name cannot be empty'),
      v.maxLength(200, 'Event name must be at most 200 characters')
    )
  ),
  code: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Event code cannot be empty'),
      v.maxLength(50, 'Event code must be at most 50 characters')
    )
  ),
  description: v.optional(v.string()),
  startDate: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid start date'))),
  endDate: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid end date'))),
  status: v.optional(EventStatusEnum),
  autoExpireBadges: v.optional(v.boolean()),
  customRoles: v.optional(v.record(v.string(), v.unknown())),
})

/**
 * Event response schema
 */
export const EventResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  code: v.string(),
  description: v.nullable(v.string()),
  startDate: v.string(),
  endDate: v.string(),
  status: EventStatusEnum,
  autoExpireBadges: v.boolean(),
  customRoles: v.nullable(v.record(v.string(), v.unknown())),
  createdBy: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Create attendee request schema
 */
export const CreateAttendeeSchema = v.object({
  eventId: v.pipe(v.string('Event ID is required'), v.uuid('Invalid event ID')),
  name: v.pipe(
    v.string('Attendee name is required'),
    v.minLength(1, 'Attendee name cannot be empty'),
    v.maxLength(200, 'Attendee name must be at most 200 characters')
  ),
  rank: v.optional(v.string()),
  organization: v.pipe(
    v.string('Organization is required'),
    v.minLength(1, 'Organization cannot be empty'),
    v.maxLength(200, 'Organization must be at most 200 characters')
  ),
  role: v.pipe(
    v.string('Role is required'),
    v.minLength(1, 'Role cannot be empty'),
    v.maxLength(100, 'Role must be at most 100 characters')
  ),
  badgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  badgeAssignedAt: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid date'))),
  accessStart: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid date'))),
  accessEnd: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid date'))),
  status: v.optional(AttendeeStatusEnum),
})

/**
 * Update attendee request schema
 */
export const UpdateAttendeeSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Attendee name cannot be empty'),
      v.maxLength(200, 'Attendee name must be at most 200 characters')
    )
  ),
  rank: v.optional(v.string()),
  organization: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Organization cannot be empty'),
      v.maxLength(200, 'Organization must be at most 200 characters')
    )
  ),
  role: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Role cannot be empty'),
      v.maxLength(100, 'Role must be at most 100 characters')
    )
  ),
  badgeId: v.optional(v.pipe(v.string(), v.uuid('Invalid badge ID'))),
  badgeAssignedAt: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid date'))),
  accessStart: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid date'))),
  accessEnd: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid date'))),
  status: v.optional(AttendeeStatusEnum),
})

/**
 * Event attendee response schema
 */
export const AttendeeResponseSchema = v.object({
  id: v.string(),
  eventId: v.string(),
  name: v.string(),
  rank: v.nullable(v.string()),
  organization: v.string(),
  role: v.string(),
  badgeId: v.nullable(v.string()),
  badgeAssignedAt: v.nullable(v.string()),
  accessStart: v.nullable(v.string()),
  accessEnd: v.nullable(v.string()),
  status: AttendeeStatusEnum,
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Assign badge to attendee request schema
 */
export const AssignBadgeToAttendeeSchema = v.object({
  badgeId: v.pipe(v.string('Badge ID is required'), v.uuid('Invalid badge ID')),
})

/**
 * Event presence stats response schema
 */
export const EventPresenceStatsResponseSchema = v.object({
  eventId: v.string(),
  totalAttendees: v.number(),
  activeAttendees: v.number(),
  checkedOut: v.number(),
  expired: v.number(),
  pending: v.number(),
})

/**
 * Close event response schema
 */
export const CloseEventResponseSchema = v.object({
  event: EventResponseSchema,
  expiredCount: v.number(),
})

/**
 * Available badge response schema
 */
export const AvailableBadgeSchema = v.object({
  id: v.string(),
  serialNumber: v.string(),
})

/**
 * Event list response schema
 */
export const EventListResponseSchema = v.object({
  events: v.array(EventResponseSchema),
})

/**
 * Attendee list response schema
 */
export const AttendeeListResponseSchema = v.object({
  attendees: v.array(AttendeeResponseSchema),
})

/**
 * Available badges response schema
 */
export const AvailableBadgesResponseSchema = v.object({
  badges: v.array(AvailableBadgeSchema),
})

// Type exports
export type CreateEventInput = v.InferOutput<typeof CreateEventSchema>
export type UpdateEventInput = v.InferOutput<typeof UpdateEventSchema>
export type EventResponse = v.InferOutput<typeof EventResponseSchema>
export type CreateAttendeeInput = v.InferOutput<typeof CreateAttendeeSchema>
export type UpdateAttendeeInput = v.InferOutput<typeof UpdateAttendeeSchema>
export type AttendeeResponse = v.InferOutput<typeof AttendeeResponseSchema>
export type AssignBadgeToAttendeeInput = v.InferOutput<typeof AssignBadgeToAttendeeSchema>
export type EventPresenceStatsResponse = v.InferOutput<typeof EventPresenceStatsResponseSchema>
export type CloseEventResponse = v.InferOutput<typeof CloseEventResponseSchema>
export type AvailableBadge = v.InferOutput<typeof AvailableBadgeSchema>
export type EventListResponse = v.InferOutput<typeof EventListResponseSchema>
export type AttendeeListResponse = v.InferOutput<typeof AttendeeListResponseSchema>
export type AvailableBadgesResponse = v.InferOutput<typeof AvailableBadgesResponseSchema>
