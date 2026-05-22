import * as v from 'valibot'

export const TemporaryPersonnelAssignmentStatusEnum = v.picklist(
  ['draft', 'active', 'ended', 'revoked'],
  'Invalid temporary personnel assignment status'
)
export type TemporaryPersonnelAssignmentStatus = v.InferOutput<
  typeof TemporaryPersonnelAssignmentStatusEnum
>

export const TemporaryPersonnelStatusEnum = v.picklist(
  ['active', 'ended', 'revoked'],
  'Invalid temporary personnel status'
)
export type TemporaryPersonnelStatus = v.InferOutput<typeof TemporaryPersonnelStatusEnum>

export const TemporaryPersonnelNfcAssignmentStatusEnum = v.picklist(
  ['assigned', 'ended', 'returned', 'revoked'],
  'Invalid temporary personnel NFC assignment status'
)
export type TemporaryPersonnelNfcAssignmentStatus = v.InferOutput<
  typeof TemporaryPersonnelNfcAssignmentStatusEnum
>

export const TemporaryPersonnelCheckinDirectionEnum = v.picklist(['in', 'out'])
export type TemporaryPersonnelCheckinDirection = v.InferOutput<
  typeof TemporaryPersonnelCheckinDirectionEnum
>

const NameSchema = v.pipe(
  v.string('Name is required'),
  v.minLength(1, 'Name cannot be empty'),
  v.maxLength(200, 'Name must be at most 200 characters')
)

const SponsorNameSchema = v.pipe(
  v.string('Assignment sponsor is required'),
  v.minLength(1, 'Assignment sponsor cannot be empty'),
  v.maxLength(200, 'Assignment sponsor must be at most 200 characters')
)

const OrganizationSchema = v.pipe(
  v.string('Organization is required'),
  v.minLength(1, 'Organization cannot be empty'),
  v.maxLength(200, 'Organization must be at most 200 characters')
)

const OptionalShortTextSchema = v.pipe(
  v.string(),
  v.minLength(1, 'Value cannot be empty'),
  v.maxLength(100, 'Value must be at most 100 characters')
)

const OptionalPhoneSchema = v.pipe(
  v.string(),
  v.minLength(7, 'Mobile phone must be at least 7 characters'),
  v.maxLength(25, 'Mobile phone must be at most 25 characters')
)

const NotesSchema = v.pipe(v.string(), v.maxLength(1000, 'Notes must be at most 1000 characters'))

export const TemporaryPersonnelAssignmentIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid temporary personnel assignment ID')),
})

export const TemporaryPersonnelIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid temporary personnel ID')),
})

export const TemporaryPersonnelNfcAssignmentIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid temporary personnel NFC assignment ID')),
})

export const TemporaryPersonnelAssignmentListQuerySchema = v.object({
  includeHistory: v.optional(
    v.pipe(
      v.string(),
      v.transform((value) => value === 'true')
    )
  ),
})

export const CreateTemporaryPersonnelAssignmentSchema = v.pipe(
  v.object({
    name: NameSchema,
    sponsorName: SponsorNameSchema,
    sponsorMemberId: v.optional(v.pipe(v.string(), v.uuid('Invalid sponsor member ID'))),
    unitEventId: v.optional(v.pipe(v.string(), v.uuid('Invalid unit event ID'))),
    startsAt: v.pipe(v.string('Start time is required'), v.isoTimestamp('Invalid start time')),
    endsAt: v.pipe(v.string('End time is required'), v.isoTimestamp('Invalid end time')),
    status: v.optional(TemporaryPersonnelAssignmentStatusEnum),
    notes: v.optional(NotesSchema),
  }),
  v.check(
    (data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(),
    'Assignment end must be after start'
  )
)

export const UpdateTemporaryPersonnelAssignmentSchema = v.pipe(
  v.object({
    name: v.optional(NameSchema),
    sponsorName: v.optional(SponsorNameSchema),
    sponsorMemberId: v.optional(
      v.nullable(v.pipe(v.string(), v.uuid('Invalid sponsor member ID')))
    ),
    unitEventId: v.optional(v.nullable(v.pipe(v.string(), v.uuid('Invalid unit event ID')))),
    startsAt: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid start time'))),
    endsAt: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid end time'))),
    status: v.optional(TemporaryPersonnelAssignmentStatusEnum),
    notes: v.optional(v.nullable(NotesSchema)),
  }),
  v.check((data) => {
    if (!data.startsAt || !data.endsAt) return true
    return new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime()
  }, 'Assignment end must be after start')
)

export const TemporaryPersonnelLifecycleActionSchema = v.object({
  reason: v.optional(v.pipe(v.string(), v.maxLength(500, 'Reason must be 500 characters or less'))),
})

export const CreateTemporaryPersonnelSchema = v.object({
  displayName: NameSchema,
  rankPrefix: v.optional(
    v.pipe(v.string(), v.minLength(1, 'Rank/title cannot be empty'), v.maxLength(50))
  ),
  firstName: v.optional(OptionalShortTextSchema),
  lastName: v.optional(OptionalShortTextSchema),
  organization: OrganizationSchema,
  role: v.optional(OptionalShortTextSchema),
  mobilePhone: v.optional(OptionalPhoneSchema),
  notes: v.optional(NotesSchema),
})

export const UpdateTemporaryPersonnelSchema = v.object({
  displayName: v.optional(NameSchema),
  rankPrefix: v.optional(
    v.nullable(v.pipe(v.string(), v.minLength(1, 'Rank/title cannot be empty'), v.maxLength(50)))
  ),
  firstName: v.optional(v.nullable(OptionalShortTextSchema)),
  lastName: v.optional(v.nullable(OptionalShortTextSchema)),
  organization: v.optional(OrganizationSchema),
  role: v.optional(v.nullable(OptionalShortTextSchema)),
  mobilePhone: v.optional(v.nullable(OptionalPhoneSchema)),
  notes: v.optional(v.nullable(NotesSchema)),
})

export const AssignTemporaryPersonnelNfcTagSchema = v.object({
  badgeId: v.pipe(v.string('Badge ID is required'), v.uuid('Invalid badge ID')),
})

export const ReturnTemporaryPersonnelNfcTagSchema = v.object({
  reason: v.optional(v.pipe(v.string(), v.maxLength(500, 'Reason must be 500 characters or less'))),
})

export const TemporaryPersonnelScanSchema = v.object({
  serialNumber: v.pipe(
    v.string('Serial number is required'),
    v.minLength(1, 'Serial number cannot be empty'),
    v.maxLength(100, 'Serial number must be at most 100 characters')
  ),
  kioskId: v.pipe(
    v.string('Kiosk ID is required'),
    v.minLength(1, 'Kiosk ID cannot be empty'),
    v.maxLength(50, 'Kiosk ID must be at most 50 characters')
  ),
  timestamp: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid timestamp'))),
})

export const ManualTemporaryPersonnelCheckinSchema = v.object({
  direction: TemporaryPersonnelCheckinDirectionEnum,
  kioskId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(50))),
  timestamp: v.optional(v.pipe(v.string(), v.isoTimestamp('Invalid timestamp'))),
  reason: v.pipe(
    v.string('Reason is required'),
    v.minLength(1, 'Reason is required'),
    v.maxLength(500, 'Reason must be 500 characters or less')
  ),
})

export const TemporaryPersonnelNfcAssignmentResponseSchema = v.object({
  id: v.string(),
  temporaryPersonnelId: v.string(),
  badgeId: v.string(),
  badgeSerialNumber: v.string(),
  status: TemporaryPersonnelNfcAssignmentStatusEnum,
  assignedAt: v.string(),
  endedAt: v.nullable(v.string()),
  returnedAt: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})

export const TemporaryPersonnelCheckinResponseSchema = v.object({
  id: v.string(),
  temporaryPersonnelId: v.string(),
  badgeId: v.nullable(v.string()),
  nfcAssignmentId: v.nullable(v.string()),
  direction: TemporaryPersonnelCheckinDirectionEnum,
  timestamp: v.string(),
  kioskId: v.string(),
  method: v.string(),
  reason: v.nullable(v.string()),
  createdByAdmin: v.nullable(v.string()),
  createdAt: v.string(),
})

export const TemporaryPersonnelResponseSchema = v.object({
  id: v.string(),
  assignmentId: v.string(),
  displayName: v.string(),
  rankPrefix: v.nullable(v.string()),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  organization: v.string(),
  role: v.nullable(v.string()),
  mobilePhone: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  status: TemporaryPersonnelStatusEnum,
  endedAt: v.nullable(v.string()),
  revokedAt: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  currentNfcAssignment: v.nullable(TemporaryPersonnelNfcAssignmentResponseSchema),
  lastCheckin: v.nullable(TemporaryPersonnelCheckinResponseSchema),
})

export const TemporaryPersonnelAssignmentResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  sponsorName: v.string(),
  sponsorMemberId: v.nullable(v.string()),
  unitEventId: v.nullable(v.string()),
  startsAt: v.string(),
  endsAt: v.string(),
  status: TemporaryPersonnelAssignmentStatusEnum,
  notes: v.nullable(v.string()),
  endedAt: v.nullable(v.string()),
  revokedAt: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  personnelCount: v.number(),
  activePersonnelCount: v.number(),
  presentPersonnelCount: v.number(),
  personnel: v.array(TemporaryPersonnelResponseSchema),
})

export const TemporaryPersonnelAssignmentListResponseSchema = v.object({
  assignments: v.array(TemporaryPersonnelAssignmentResponseSchema),
  total: v.number(),
})

export const TemporaryPersonnelScanResponseSchema = v.object({
  success: v.boolean(),
  direction: TemporaryPersonnelCheckinDirectionEnum,
  temporaryPersonnel: TemporaryPersonnelResponseSchema,
  assignment: TemporaryPersonnelAssignmentResponseSchema,
  checkin: TemporaryPersonnelCheckinResponseSchema,
  message: v.string(),
})

export const TemporaryPersonnelHistoryResponseSchema = v.object({
  assignment: TemporaryPersonnelAssignmentResponseSchema,
  checkins: v.array(TemporaryPersonnelCheckinResponseSchema),
  nfcAssignments: v.array(TemporaryPersonnelNfcAssignmentResponseSchema),
})

export type TemporaryPersonnelAssignmentListQuery = v.InferOutput<
  typeof TemporaryPersonnelAssignmentListQuerySchema
>
export type TemporaryPersonnelAssignmentIdParam = v.InferOutput<
  typeof TemporaryPersonnelAssignmentIdParamSchema
>
export type TemporaryPersonnelIdParam = v.InferOutput<typeof TemporaryPersonnelIdParamSchema>
export type TemporaryPersonnelNfcAssignmentIdParam = v.InferOutput<
  typeof TemporaryPersonnelNfcAssignmentIdParamSchema
>
export type CreateTemporaryPersonnelAssignmentInput = v.InferOutput<
  typeof CreateTemporaryPersonnelAssignmentSchema
>
export type UpdateTemporaryPersonnelAssignmentInput = v.InferOutput<
  typeof UpdateTemporaryPersonnelAssignmentSchema
>
export type TemporaryPersonnelLifecycleActionInput = v.InferOutput<
  typeof TemporaryPersonnelLifecycleActionSchema
>
export type CreateTemporaryPersonnelInput = v.InferOutput<typeof CreateTemporaryPersonnelSchema>
export type UpdateTemporaryPersonnelInput = v.InferOutput<typeof UpdateTemporaryPersonnelSchema>
export type AssignTemporaryPersonnelNfcTagInput = v.InferOutput<
  typeof AssignTemporaryPersonnelNfcTagSchema
>
export type ReturnTemporaryPersonnelNfcTagInput = v.InferOutput<
  typeof ReturnTemporaryPersonnelNfcTagSchema
>
export type TemporaryPersonnelScanInput = v.InferOutput<typeof TemporaryPersonnelScanSchema>
export type ManualTemporaryPersonnelCheckinInput = v.InferOutput<
  typeof ManualTemporaryPersonnelCheckinSchema
>
export type TemporaryPersonnelNfcAssignmentResponse = v.InferOutput<
  typeof TemporaryPersonnelNfcAssignmentResponseSchema
>
export type TemporaryPersonnelCheckinResponse = v.InferOutput<
  typeof TemporaryPersonnelCheckinResponseSchema
>
export type TemporaryPersonnelResponse = v.InferOutput<typeof TemporaryPersonnelResponseSchema>
export type TemporaryPersonnelAssignmentResponse = v.InferOutput<
  typeof TemporaryPersonnelAssignmentResponseSchema
>
export type TemporaryPersonnelAssignmentListResponse = v.InferOutput<
  typeof TemporaryPersonnelAssignmentListResponseSchema
>
export type TemporaryPersonnelScanResponse = v.InferOutput<
  typeof TemporaryPersonnelScanResponseSchema
>
export type TemporaryPersonnelHistoryResponse = v.InferOutput<
  typeof TemporaryPersonnelHistoryResponseSchema
>
