import * as v from 'valibot'

/**
 * DDS assignment status enum
 */
export const DdsStatusEnum = v.picklist(['pending', 'active', 'transferred', 'released'])

/**
 * DDS member details schema
 */
export const DdsMemberSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  division: v.nullable(v.string()),
})

/**
 * DDS assignment response schema
 */
export const DdsAssignmentResponseSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  assignedDate: v.string(),
  acceptedAt: v.nullable(v.string()),
  releasedAt: v.nullable(v.string()),
  transferredTo: v.nullable(v.string()),
  assignedBy: v.nullable(v.string()),
  status: DdsStatusEnum,
  notes: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
  member: DdsMemberSchema,
  assignedByAdminName: v.nullable(v.string()),
})

/**
 * Assign DDS request schema
 */
export const AssignDdsSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID')),
  notes: v.optional(v.string()),
})

/**
 * Set today's live DDS request schema
 */
export const SetTodayDdsSchema = v.object({
  memberId: v.pipe(v.string('Member ID is required'), v.uuid('Invalid member ID')),
  notes: v.optional(v.string()),
})

/**
 * Transfer DDS request schema
 */
export const TransferDdsSchema = v.object({
  toMemberId: v.pipe(v.string('Target member ID is required'), v.uuid('Invalid member ID')),
  notes: v.optional(v.string()),
})

/**
 * Release DDS request schema
 */
export const ReleaseDdsSchema = v.object({
  notes: v.optional(v.string()),
})

/**
 * Responsibility audit log entry schema
 */
export const ResponsibilityAuditLogSchema = v.object({
  id: v.string(),
  memberId: v.string(),
  tagName: v.string(),
  action: v.string(),
  fromMemberId: v.nullable(v.string()),
  toMemberId: v.nullable(v.string()),
  performedBy: v.nullable(v.string()),
  performedByType: v.string(),
  timestamp: v.string(),
  notes: v.nullable(v.string()),
})

/**
 * Next DDS member schema (simplified)
 */
export const NextDdsMemberSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
})

export const DdsHandoverStateSchema = v.object({
  isPending: v.boolean(),
  firstOperationalDay: v.nullable(v.string()),
  outgoingDds: v.nullable(NextDdsMemberSchema),
  incomingDds: v.nullable(NextDdsMemberSchema),
})

/**
 * Shared lightweight member schema for kiosk responsibility state
 */
export const KioskResponsibilityStateMemberSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
})

export const KioskResponsibilityPromptVariantSchema = v.picklist([
  'expected_dds',
  'opener_only',
  'replacement_candidate',
  'building_open_dds_pending',
])

export const KioskExpectedDdsSchema = v.object({
  member: KioskResponsibilityStateMemberSchema,
  source: v.picklist(['live', 'scheduled']),
  matchesScannedMember: v.boolean(),
})

export const KioskCurrentOpenContextSchema = v.object({
  openedBy: v.nullable(KioskResponsibilityStateMemberSchema),
  openedAt: v.nullable(v.string()),
  currentLockupHolder: v.nullable(KioskResponsibilityStateMemberSchema),
  currentHolderAcquiredAt: v.nullable(v.string()),
})

export const KioskPresentMemberSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  checkedInAt: v.string(),
})

export const KioskOperationalCycleSchema = v.object({
  id: v.string(),
  openedBy: v.nullable(KioskResponsibilityStateMemberSchema),
  openedAt: v.string(),
  closedBy: v.nullable(KioskResponsibilityStateMemberSchema),
  closedAt: v.nullable(v.string()),
  isCurrent: v.boolean(),
})

/**
 * Kiosk responsibility prompt state schema
 */
export const KioskResponsibilityStateResponseSchema = v.object({
  shouldPrompt: v.boolean(),
  promptVariant: KioskResponsibilityPromptVariantSchema,
  isFirstMemberCheckin: v.boolean(),
  needsDds: v.boolean(),
  needsBuildingOpen: v.boolean(),
  buildingStatus: v.picklist(['secured', 'open', 'locking_up']),
  canAcceptDds: v.boolean(),
  canOpenBuilding: v.boolean(),
  member: KioskResponsibilityStateMemberSchema,
  expectedDds: v.nullable(KioskExpectedDdsSchema),
  scheduledDds: v.nullable(KioskResponsibilityStateMemberSchema),
  currentDds: v.nullable(
    v.object({
      id: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      rank: v.string(),
      status: v.picklist(['pending', 'active']),
    })
  ),
  currentLockupHolder: v.nullable(KioskResponsibilityStateMemberSchema),
  currentOpenContext: v.nullable(KioskCurrentOpenContextSchema),
  presentMembers: v.array(KioskPresentMemberSchema),
  presentVisitorCount: v.number(),
  todayCycles: v.array(KioskOperationalCycleSchema),
})

/**
 * Get current DDS response schema
 */
export const GetCurrentDdsResponseSchema = v.object({
  assignment: v.nullable(DdsAssignmentResponseSchema),
  nextDds: v.nullable(NextDdsMemberSchema),
  isDdsOnSite: v.boolean(),
  handover: DdsHandoverStateSchema,
})

/**
 * DDS operation response schema
 */
export const DdsOperationResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  assignment: DdsAssignmentResponseSchema,
})

/**
 * Check DDS exists response schema
 */
export const CheckDdsExistsResponseSchema = v.object({
  exists: v.boolean(),
})

/**
 * DDS audit log response schema
 */
export const DdsAuditLogResponseSchema = v.object({
  logs: v.array(ResponsibilityAuditLogSchema),
  count: v.number(),
})

/**
 * DDS audit log query schema
 */
export const DdsAuditLogQuerySchema = v.object({
  memberId: v.optional(v.pipe(v.string(), v.uuid('Invalid member ID'))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
})

// Type exports
export type DdsAssignmentResponse = v.InferOutput<typeof DdsAssignmentResponseSchema>
export type AssignDdsInput = v.InferOutput<typeof AssignDdsSchema>
export type SetTodayDdsInput = v.InferOutput<typeof SetTodayDdsSchema>
export type TransferDdsInput = v.InferOutput<typeof TransferDdsSchema>
export type ReleaseDdsInput = v.InferOutput<typeof ReleaseDdsSchema>
export type ResponsibilityAuditLog = v.InferOutput<typeof ResponsibilityAuditLogSchema>
export type NextDdsMember = v.InferOutput<typeof NextDdsMemberSchema>
export type DdsHandoverState = v.InferOutput<typeof DdsHandoverStateSchema>
export type KioskResponsibilityStateMember = v.InferOutput<
  typeof KioskResponsibilityStateMemberSchema
>
export type KioskResponsibilityPromptVariant = v.InferOutput<
  typeof KioskResponsibilityPromptVariantSchema
>
export type KioskExpectedDds = v.InferOutput<typeof KioskExpectedDdsSchema>
export type KioskCurrentOpenContext = v.InferOutput<typeof KioskCurrentOpenContextSchema>
export type KioskPresentMember = v.InferOutput<typeof KioskPresentMemberSchema>
export type KioskOperationalCycle = v.InferOutput<typeof KioskOperationalCycleSchema>
export type KioskResponsibilityStateResponse = v.InferOutput<
  typeof KioskResponsibilityStateResponseSchema
>
export type GetCurrentDdsResponse = v.InferOutput<typeof GetCurrentDdsResponseSchema>
export type DdsOperationResponse = v.InferOutput<typeof DdsOperationResponseSchema>
export type CheckDdsExistsResponse = v.InferOutput<typeof CheckDdsExistsResponseSchema>
export type DdsAuditLogResponse = v.InferOutput<typeof DdsAuditLogResponseSchema>
export type DdsAuditLogQuery = v.InferOutput<typeof DdsAuditLogQuerySchema>
