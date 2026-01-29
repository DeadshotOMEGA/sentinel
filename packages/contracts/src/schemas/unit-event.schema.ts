import * as v from 'valibot'

// ============================================================================
// Unit Event Type Schemas
// ============================================================================

export const UnitEventCategorySchema = v.picklist([
  'mess_dinner',
  'ceremonial',
  'training',
  'social',
  'exercise',
  'vip_visit',
  'remembrance',
  'administrative',
  'other',
])

export const UnitEventTypeResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  category: UnitEventCategorySchema,
  defaultDurationMinutes: v.number(),
  requiresDutyWatch: v.boolean(),
  defaultMetadata: v.nullable(v.record(v.string(), v.unknown())),
  displayOrder: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

export const UnitEventTypeListResponseSchema = v.object({
  data: v.array(UnitEventTypeResponseSchema),
})

// ============================================================================
// Unit Event Schemas
// ============================================================================

export const UnitEventStatusSchema = v.picklist([
  'draft',
  'planned',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
])

export const UnitEventDutyAssignmentStatusSchema = v.picklist([
  'assigned',
  'confirmed',
  'declined',
  'released',
])

/**
 * Unit event duty position response (nested in event)
 */
export const UnitEventDutyPositionResponseSchema = v.object({
  id: v.string(),
  eventId: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  maxSlots: v.number(),
  isStandard: v.boolean(),
  displayOrder: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Unit event duty assignment response (nested in event)
 */
export const UnitEventDutyAssignmentResponseSchema = v.object({
  id: v.string(),
  eventId: v.string(),
  eventDutyPositionId: v.nullable(v.string()),
  memberId: v.string(),
  status: UnitEventDutyAssignmentStatusSchema,
  isVolunteer: v.boolean(),
  confirmedAt: v.nullable(v.string()),
  releasedAt: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  member: v.object({
    id: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    rank: v.string(),
    serviceNumber: v.string(),
  }),
  eventDutyPosition: v.nullable(
    v.object({
      id: v.string(),
      code: v.string(),
      name: v.string(),
    })
  ),
})

/**
 * Unit event response schema
 */
export const UnitEventResponseSchema = v.object({
  id: v.string(),
  title: v.string(),
  eventTypeId: v.nullable(v.string()),
  eventDate: v.string(),
  startTime: v.nullable(v.string()),
  endTime: v.nullable(v.string()),
  location: v.nullable(v.string()),
  description: v.nullable(v.string()),
  organizer: v.nullable(v.string()),
  requiresDutyWatch: v.boolean(),
  status: UnitEventStatusSchema,
  metadata: v.nullable(v.record(v.string(), v.unknown())),
  notes: v.nullable(v.string()),
  createdBy: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  eventType: v.nullable(
    v.object({
      id: v.string(),
      name: v.string(),
      category: v.string(),
    })
  ),
})

/**
 * Unit event with duty positions and assignments
 */
export const UnitEventWithDetailsResponseSchema = v.object({
  ...UnitEventResponseSchema.entries,
  dutyPositions: v.array(UnitEventDutyPositionResponseSchema),
  dutyAssignments: v.array(UnitEventDutyAssignmentResponseSchema),
})

/**
 * List of unit events
 */
export const UnitEventListResponseSchema = v.object({
  data: v.array(UnitEventResponseSchema),
  total: v.number(),
})

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Create unit event input
 */
export const CreateUnitEventInputSchema = v.object({
  title: v.pipe(
    v.string('Title is required'),
    v.minLength(1, 'Title cannot be empty'),
    v.maxLength(200, 'Title must be at most 200 characters')
  ),
  eventTypeId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid event type ID format')))),
  eventDate: v.pipe(
    v.string('Event date is required'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  ),
  startTime: v.optional(
    v.nullable(
      v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'))
    )
  ),
  endTime: v.optional(
    v.nullable(
      v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'))
    )
  ),
  location: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200, 'Location must be at most 200 characters')))),
  description: v.optional(v.nullable(v.string())),
  organizer: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200, 'Organizer must be at most 200 characters')))),
  requiresDutyWatch: v.optional(v.boolean()),
  status: v.optional(UnitEventStatusSchema),
  metadata: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Update unit event input
 */
export const UpdateUnitEventInputSchema = v.object({
  title: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Title cannot be empty'),
      v.maxLength(200, 'Title must be at most 200 characters')
    )
  ),
  eventTypeId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid event type ID format')))),
  eventDate: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
  ),
  startTime: v.optional(
    v.nullable(
      v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'))
    )
  ),
  endTime: v.optional(
    v.nullable(
      v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'))
    )
  ),
  location: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200, 'Location must be at most 200 characters')))),
  description: v.optional(v.nullable(v.string())),
  organizer: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200, 'Organizer must be at most 200 characters')))),
  requiresDutyWatch: v.optional(v.boolean()),
  metadata: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Update unit event status input
 */
export const UpdateUnitEventStatusInputSchema = v.object({
  status: UnitEventStatusSchema,
})

/**
 * Create unit event duty position input
 */
export const CreateUnitEventPositionInputSchema = v.object({
  code: v.pipe(
    v.string('Position code is required'),
    v.minLength(1, 'Code cannot be empty'),
    v.maxLength(50, 'Code must be at most 50 characters')
  ),
  name: v.pipe(
    v.string('Position name is required'),
    v.minLength(1, 'Name cannot be empty'),
    v.maxLength(100, 'Name must be at most 100 characters')
  ),
  description: v.optional(v.nullable(v.string())),
  maxSlots: v.optional(v.pipe(v.number(), v.minValue(1, 'Max slots must be at least 1'))),
})

/**
 * Update unit event duty position input
 */
export const UpdateUnitEventPositionInputSchema = v.object({
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Name cannot be empty'),
      v.maxLength(100, 'Name must be at most 100 characters')
    )
  ),
  description: v.optional(v.nullable(v.string())),
  maxSlots: v.optional(v.pipe(v.number(), v.minValue(1, 'Max slots must be at least 1'))),
})

/**
 * Create unit event duty assignment input
 */
export const CreateUnitEventAssignmentInputSchema = v.object({
  eventDutyPositionId: v.optional(
    v.nullable(v.pipe(v.string(), v.uuid('Invalid position ID format')))
  ),
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID format')),
  isVolunteer: v.optional(v.boolean()),
  notes: v.optional(v.nullable(v.string())),
})

// ============================================================================
// Query Schemas
// ============================================================================

export const UnitEventListQuerySchema = v.object({
  startDate: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
  ),
  endDate: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
  ),
  category: v.optional(UnitEventCategorySchema),
  status: v.optional(UnitEventStatusSchema),
  requiresDutyWatch: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => val === 'true')
    )
  ),
  limit: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => parseInt(val, 10)),
      v.number(),
      v.minValue(1),
      v.maxValue(100)
    )
  ),
  offset: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => parseInt(val, 10)),
      v.number(),
      v.minValue(0)
    )
  ),
})

// ============================================================================
// Path Param Schemas
// ============================================================================

export const UnitEventIdParamSchema = v.object({
  id: v.pipe(v.string('Event ID is required'), v.uuid('Invalid event ID format')),
})

export const UnitEventPositionParamsSchema = v.object({
  id: v.pipe(v.string('Event ID is required'), v.uuid('Invalid event ID format')),
  positionId: v.pipe(
    v.string('Position ID is required'),
    v.uuid('Invalid position ID format')
  ),
})

export const UnitEventAssignmentParamsSchema = v.object({
  id: v.pipe(v.string('Event ID is required'), v.uuid('Invalid event ID format')),
  assignmentId: v.pipe(
    v.string('Assignment ID is required'),
    v.uuid('Invalid assignment ID format')
  ),
})

// ============================================================================
// Type Exports
// ============================================================================

export type UnitEventCategory = v.InferOutput<typeof UnitEventCategorySchema>
export type UnitEventStatus = v.InferOutput<typeof UnitEventStatusSchema>
export type UnitEventDutyAssignmentStatus = v.InferOutput<typeof UnitEventDutyAssignmentStatusSchema>
export type UnitEventTypeResponse = v.InferOutput<typeof UnitEventTypeResponseSchema>
export type UnitEventTypeListResponse = v.InferOutput<typeof UnitEventTypeListResponseSchema>
export type UnitEventDutyPositionResponse = v.InferOutput<typeof UnitEventDutyPositionResponseSchema>
export type UnitEventDutyAssignmentResponse = v.InferOutput<typeof UnitEventDutyAssignmentResponseSchema>
export type UnitEventResponse = v.InferOutput<typeof UnitEventResponseSchema>
export type UnitEventWithDetailsResponse = v.InferOutput<typeof UnitEventWithDetailsResponseSchema>
export type UnitEventListResponse = v.InferOutput<typeof UnitEventListResponseSchema>
export type CreateUnitEventInput = v.InferOutput<typeof CreateUnitEventInputSchema>
export type UpdateUnitEventInput = v.InferOutput<typeof UpdateUnitEventInputSchema>
export type UpdateUnitEventStatusInput = v.InferOutput<typeof UpdateUnitEventStatusInputSchema>
export type CreateUnitEventPositionInput = v.InferOutput<typeof CreateUnitEventPositionInputSchema>
export type UpdateUnitEventPositionInput = v.InferOutput<typeof UpdateUnitEventPositionInputSchema>
export type CreateUnitEventAssignmentInput = v.InferOutput<typeof CreateUnitEventAssignmentInputSchema>
export type UnitEventListQuery = v.InferOutput<typeof UnitEventListQuerySchema>
export type UnitEventIdParam = v.InferOutput<typeof UnitEventIdParamSchema>
export type UnitEventPositionParams = v.InferOutput<typeof UnitEventPositionParamsSchema>
export type UnitEventAssignmentParams = v.InferOutput<typeof UnitEventAssignmentParamsSchema>
