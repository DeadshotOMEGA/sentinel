import * as v from 'valibot'

const MAX_ACTION_NOTE_LENGTH = 500

export const DutyAssignmentMemberSummarySchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  serviceNumber: v.string(),
})

export const DutyAssignmentPositionSummarySchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  maxSlots: v.number(),
  dutyRoleCode: v.string(),
  dutyRoleName: v.string(),
})

export const LiveDutyAssignmentEndReasonSchema = v.picklist([
  'manual_clear',
  'member_checkout',
  'lockup_execution',
  'daily_reset',
  'reassigned',
])

export const LiveDutyAssignmentResponseSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  dutyPositionId: v.string(),
  notes: v.nullable(v.string()),
  startedAt: v.string(),
  endedAt: v.nullable(v.string()),
  endedReason: v.nullable(LiveDutyAssignmentEndReasonSchema),
  createdAt: v.string(),
  updatedAt: v.string(),
  member: DutyAssignmentMemberSummarySchema,
  dutyPosition: DutyAssignmentPositionSummarySchema,
})

export const LiveDutyAssignmentListResponseSchema = v.object({
  data: v.array(LiveDutyAssignmentResponseSchema),
})

export const CreateLiveDutyAssignmentInputSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID format')),
  dutyPositionId: v.pipe(
    v.string('Duty position ID is required'),
    v.uuid('Invalid duty position ID format')
  ),
  notes: v.optional(
    v.nullable(
      v.pipe(
        v.string(),
        v.maxLength(MAX_ACTION_NOTE_LENGTH, 'Notes must be 500 characters or less')
      )
    )
  ),
})

export const ClearLiveDutyAssignmentInputSchema = v.object({
  notes: v.optional(
    v.nullable(
      v.pipe(
        v.string(),
        v.maxLength(MAX_ACTION_NOTE_LENGTH, 'Notes must be 500 characters or less')
      )
    )
  ),
})

export const LiveDutyAssignmentParamsSchema = v.object({
  assignmentId: v.pipe(
    v.string('Assignment ID is required'),
    v.uuid('Invalid assignment ID format')
  ),
})

export const DutyWatchLiveCoverageSchema = v.object({
  assignmentId: v.string(),
  startedAt: v.string(),
  notes: v.nullable(v.string()),
  member: DutyAssignmentMemberSummarySchema,
})

export type DutyAssignmentMemberSummary = v.InferOutput<typeof DutyAssignmentMemberSummarySchema>
export type DutyAssignmentPositionSummary = v.InferOutput<
  typeof DutyAssignmentPositionSummarySchema
>
export type LiveDutyAssignmentEndReason = v.InferOutput<typeof LiveDutyAssignmentEndReasonSchema>
export type LiveDutyAssignmentResponse = v.InferOutput<typeof LiveDutyAssignmentResponseSchema>
export type LiveDutyAssignmentListResponse = v.InferOutput<
  typeof LiveDutyAssignmentListResponseSchema
>
export type CreateLiveDutyAssignmentInput = v.InferOutput<
  typeof CreateLiveDutyAssignmentInputSchema
>
export type ClearLiveDutyAssignmentInput = v.InferOutput<typeof ClearLiveDutyAssignmentInputSchema>
export type LiveDutyAssignmentParams = v.InferOutput<typeof LiveDutyAssignmentParamsSchema>
export type DutyWatchLiveCoverage = v.InferOutput<typeof DutyWatchLiveCoverageSchema>
