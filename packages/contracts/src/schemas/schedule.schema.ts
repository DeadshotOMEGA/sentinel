import * as v from 'valibot'
import { DwNightOverrideResponseSchema } from './dw-override.schema.js'

// ============================================================================
// Duty Role Schemas
// ============================================================================

/**
 * Duty role type enum
 */
export const DutyRoleTypeSchema = v.picklist(['single', 'team'])

/**
 * Schedule type enum
 */
export const ScheduleTypeSchema = v.picklist(['weekly'])

/**
 * Duty role response schema
 */
export const DutyRoleResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  roleType: DutyRoleTypeSchema,
  scheduleType: ScheduleTypeSchema,
  activeDays: v.array(v.number()), // 1=Mon, 7=Sun
  displayOrder: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Duty role with positions response
 */
export const DutyRoleWithPositionsResponseSchema = v.object({
  ...DutyRoleResponseSchema.entries,
  positions: v.array(
    v.object({
      id: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.nullable(v.string()),
      maxSlots: v.number(),
      displayOrder: v.number(),
    })
  ),
})

/**
 * List of duty roles
 */
export const DutyRoleListResponseSchema = v.object({
  data: v.array(DutyRoleResponseSchema),
})

// ============================================================================
// Duty Position Schemas
// ============================================================================

/**
 * Duty position response schema
 */
export const DutyPositionResponseSchema = v.object({
  id: v.string(),
  dutyRoleId: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  maxSlots: v.number(),
  displayOrder: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * List of duty positions
 */
export const DutyPositionListResponseSchema = v.object({
  data: v.array(DutyPositionResponseSchema),
})

// ============================================================================
// Weekly Schedule Schemas
// ============================================================================

/**
 * Schedule status enum
 */
export const ScheduleStatusSchema = v.picklist(['draft', 'published', 'active', 'archived'])

/**
 * Assignment status enum
 */
export const AssignmentStatusSchema = v.picklist(['assigned', 'confirmed', 'released'])

/**
 * Schedule assignment response (nested in schedule)
 */
export const ScheduleAssignmentResponseSchema = v.object({
  id: v.string(),
  scheduleId: v.string(),
  dutyPositionId: v.nullable(v.string()),
  memberId: v.string(),
  status: AssignmentStatusSchema,
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
  dutyPosition: v.nullable(
    v.object({
      id: v.string(),
      code: v.string(),
      name: v.string(),
    })
  ),
})

/**
 * Weekly schedule response schema
 */
export const WeeklyScheduleResponseSchema = v.object({
  id: v.string(),
  dutyRoleId: v.string(),
  weekStartDate: v.string(), // ISO date YYYY-MM-DD
  status: ScheduleStatusSchema,
  createdBy: v.nullable(v.string()),
  publishedAt: v.nullable(v.string()),
  publishedBy: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  dutyRole: v.object({
    id: v.string(),
    code: v.string(),
    name: v.string(),
  }),
})

/**
 * Weekly schedule with assignments response
 */
export const WeeklyScheduleWithAssignmentsResponseSchema = v.object({
  ...WeeklyScheduleResponseSchema.entries,
  assignments: v.array(ScheduleAssignmentResponseSchema),
  nightOverrides: v.optional(v.array(DwNightOverrideResponseSchema)),
  createdByAdmin: v.nullable(
    v.object({
      id: v.string(),
      displayName: v.string(),
    })
  ),
  publishedByAdmin: v.nullable(
    v.object({
      id: v.string(),
      displayName: v.string(),
    })
  ),
})

/**
 * List of weekly schedules
 */
export const WeeklyScheduleListResponseSchema = v.object({
  data: v.array(WeeklyScheduleResponseSchema),
})

/**
 * List of weekly schedules with assignments
 */
export const WeeklyScheduleWithAssignmentsListResponseSchema = v.object({
  data: v.array(WeeklyScheduleWithAssignmentsResponseSchema),
})

/**
 * Create schedule input
 */
export const CreateScheduleInputSchema = v.object({
  dutyRoleId: v.pipe(v.string('Duty role ID is required'), v.uuid('Invalid duty role ID format')),
  weekStartDate: v.pipe(
    v.string('Week start date is required'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  ),
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Update schedule input
 */
export const UpdateScheduleInputSchema = v.object({
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Create assignment input
 */
export const CreateAssignmentInputSchema = v.object({
  dutyPositionId: v.optional(
    v.nullable(v.pipe(v.string(), v.uuid('Invalid duty position ID format')))
  ),
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID format')),
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Update assignment input
 */
export const UpdateAssignmentInputSchema = v.object({
  dutyPositionId: v.optional(
    v.nullable(v.pipe(v.string(), v.uuid('Invalid duty position ID format')))
  ),
  status: v.optional(AssignmentStatusSchema),
  notes: v.optional(v.nullable(v.string())),
})

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * Schedule list query parameters
 */
export const ScheduleListQuerySchema = v.object({
  dutyRoleId: v.optional(v.pipe(v.string(), v.uuid('Invalid duty role ID format'))),
  status: v.optional(ScheduleStatusSchema),
  weekStartDate: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
  ),
  weekEndDate: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
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

// DateParamSchema is exported from lockup.schema.ts - reuse it

/**
 * Schedule ID path param
 */
export const ScheduleIdParamSchema = v.object({
  id: v.pipe(v.string('Schedule ID is required'), v.uuid('Invalid schedule ID format')),
})

/**
 * Schedule and assignment ID path params
 */
export const ScheduleAssignmentParamsSchema = v.object({
  id: v.pipe(v.string('Schedule ID is required'), v.uuid('Invalid schedule ID format')),
  assignmentId: v.pipe(
    v.string('Assignment ID is required'),
    v.uuid('Invalid assignment ID format')
  ),
})

/**
 * Duty role ID path param
 */
export const DutyRoleIdParamSchema = v.object({
  id: v.pipe(v.string('Duty role ID is required'), v.uuid('Invalid duty role ID format')),
})

// ============================================================================
// DDS/Duty Watch Convenience Response Schemas
// ============================================================================

/**
 * Current DDS from schedule response
 */
export const CurrentDdsResponseSchema = v.object({
  dds: v.nullable(
    v.object({
      scheduleId: v.string(),
      assignmentId: v.string(),
      member: v.object({
        id: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        rank: v.string(),
        serviceNumber: v.string(),
      }),
      weekStartDate: v.string(),
      status: AssignmentStatusSchema,
    })
  ),
  operationalDate: v.string(),
})

/**
 * Duty watch team response
 */
export const DutyWatchTeamResponseSchema = v.object({
  scheduleId: v.nullable(v.string()),
  weekStartDate: v.nullable(v.string()),
  operationalDate: v.string(),
  isDutyWatchNight: v.boolean(),
  team: v.array(
    v.object({
      assignmentId: v.string(),
      position: v.nullable(
        v.object({
          id: v.string(),
          code: v.string(),
          name: v.string(),
        })
      ),
      member: v.object({
        id: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        rank: v.string(),
        serviceNumber: v.string(),
      }),
      status: AssignmentStatusSchema,
      isCheckedIn: v.boolean(),
    })
  ),
})

// ============================================================================
// Type Exports
// ============================================================================

export type DutyRoleType = v.InferOutput<typeof DutyRoleTypeSchema>
export type ScheduleType = v.InferOutput<typeof ScheduleTypeSchema>
export type DutyRoleResponse = v.InferOutput<typeof DutyRoleResponseSchema>
export type DutyRoleWithPositionsResponse = v.InferOutput<
  typeof DutyRoleWithPositionsResponseSchema
>
export type DutyRoleListResponse = v.InferOutput<typeof DutyRoleListResponseSchema>
export type DutyPositionResponse = v.InferOutput<typeof DutyPositionResponseSchema>
export type DutyPositionListResponse = v.InferOutput<typeof DutyPositionListResponseSchema>
export type ScheduleStatus = v.InferOutput<typeof ScheduleStatusSchema>
export type AssignmentStatus = v.InferOutput<typeof AssignmentStatusSchema>
export type ScheduleAssignmentResponse = v.InferOutput<typeof ScheduleAssignmentResponseSchema>
export type WeeklyScheduleResponse = v.InferOutput<typeof WeeklyScheduleResponseSchema>
export type WeeklyScheduleWithAssignmentsResponse = v.InferOutput<
  typeof WeeklyScheduleWithAssignmentsResponseSchema
>
export type WeeklyScheduleListResponse = v.InferOutput<typeof WeeklyScheduleListResponseSchema>
export type WeeklyScheduleWithAssignmentsListResponse = v.InferOutput<
  typeof WeeklyScheduleWithAssignmentsListResponseSchema
>
export type CreateScheduleInput = v.InferOutput<typeof CreateScheduleInputSchema>
export type UpdateScheduleInput = v.InferOutput<typeof UpdateScheduleInputSchema>
export type CreateAssignmentInput = v.InferOutput<typeof CreateAssignmentInputSchema>
export type UpdateAssignmentInput = v.InferOutput<typeof UpdateAssignmentInputSchema>
export type ScheduleListQuery = v.InferOutput<typeof ScheduleListQuerySchema>
// DateParam type is exported from lockup.schema.ts
export type ScheduleIdParam = v.InferOutput<typeof ScheduleIdParamSchema>
export type ScheduleAssignmentParams = v.InferOutput<typeof ScheduleAssignmentParamsSchema>
export type DutyRoleIdParam = v.InferOutput<typeof DutyRoleIdParamSchema>
export type CurrentDdsResponse = v.InferOutput<typeof CurrentDdsResponseSchema>
export type DutyWatchTeamResponse = v.InferOutput<typeof DutyWatchTeamResponseSchema>
