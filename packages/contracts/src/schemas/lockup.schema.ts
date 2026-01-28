import * as v from 'valibot'

// ============================================================================
// Lockup Status Schemas
// ============================================================================

/**
 * Building status enum
 */
export const BuildingStatusSchema = v.picklist(['secured', 'open', 'locking_up'])

/**
 * Lockup holder info schema
 */
export const LockupHolderSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  serviceNumber: v.string(),
})

/**
 * Lockup status response schema
 */
export const LockupStatusResponseSchema = v.object({
  date: v.string(), // ISO date string (operational date)
  buildingStatus: BuildingStatusSchema,
  currentHolder: v.nullable(LockupHolderSchema),
  acquiredAt: v.nullable(v.string()), // ISO datetime
  securedAt: v.nullable(v.string()), // ISO datetime
  securedBy: v.nullable(LockupHolderSchema),
  isActive: v.boolean(),
})

/**
 * Date param schema for status lookup
 */
export const DateParamSchema = v.object({
  date: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')),
})

// ============================================================================
// Lockup Transfer Schemas
// ============================================================================

/**
 * Transfer reason enum
 */
export const TransferReasonSchema = v.picklist([
  'manual',
  'dds_handoff',
  'duty_watch_takeover',
  'checkout_transfer',
])

/**
 * Transfer lockup request schema
 */
export const TransferLockupSchema = v.object({
  toMemberId: v.pipe(v.string(), v.uuid()),
  reason: TransferReasonSchema,
  notes: v.optional(v.nullable(v.string())),
})

/**
 * Transfer lockup response schema
 */
export const TransferLockupResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  transfer: v.object({
    id: v.string(),
    fromMemberId: v.string(),
    toMemberId: v.string(),
    transferredAt: v.string(),
    reason: v.string(),
    notes: v.nullable(v.string()),
  }),
  newHolder: LockupHolderSchema,
})

// ============================================================================
// Checkout Options Schemas
// ============================================================================

/**
 * Checkout option type
 */
export const CheckoutOptionSchema = v.picklist([
  'normal_checkout',
  'transfer_lockup',
  'execute_lockup',
])

/**
 * Eligible recipient for lockup transfer
 */
export const EligibleRecipientSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  serviceNumber: v.string(),
  qualifications: v.array(
    v.object({
      code: v.string(),
      name: v.string(),
    })
  ),
})

/**
 * Checkout options response schema
 */
export const CheckoutOptionsResponseSchema = v.object({
  memberId: v.string(),
  holdsLockup: v.boolean(),
  canCheckout: v.boolean(),
  blockReason: v.nullable(v.string()),
  availableOptions: v.array(CheckoutOptionSchema),
  eligibleRecipients: v.optional(v.array(EligibleRecipientSchema)),
})

// ============================================================================
// Lockup History Schemas
// ============================================================================

/**
 * Lockup transfer history item
 */
export const LockupTransferHistorySchema = v.object({
  id: v.string(),
  type: v.literal('transfer'),
  fromMember: LockupHolderSchema,
  toMember: LockupHolderSchema,
  reason: v.string(),
  notes: v.nullable(v.string()),
  timestamp: v.string(),
})

/**
 * Lockup execution history item
 */
export const LockupExecutionHistorySchema = v.object({
  id: v.string(),
  type: v.literal('execution'),
  executedBy: LockupHolderSchema,
  membersCheckedOut: v.number(),
  visitorsCheckedOut: v.number(),
  totalCheckedOut: v.number(),
  notes: v.nullable(v.string()),
  timestamp: v.string(),
})

/**
 * Lockup history item (union type)
 */
export const LockupHistoryItemSchema = v.union([
  LockupTransferHistorySchema,
  LockupExecutionHistorySchema,
])

/**
 * Lockup history query schema
 */
export const LockupHistoryQuerySchema = v.object({
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
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

/**
 * Lockup history response schema
 */
export const LockupHistoryResponseSchema = v.object({
  items: v.array(LockupHistoryItemSchema),
  total: v.number(),
  hasMore: v.boolean(),
})

// ============================================================================
// Present People Schemas (existing, kept for lockup execution)
// ============================================================================

/**
 * Present member for lockup schema
 */
export const PresentMemberForLockupSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  division: v.string(),
  divisionId: v.nullable(v.string()),
  memberType: v.string(),
  mess: v.nullable(v.string()),
  checkedInAt: v.string(),
  kioskId: v.optional(v.string()),
})

/**
 * Present visitor for lockup schema
 */
export const PresentVisitorForLockupSchema = v.object({
  id: v.string(),
  name: v.string(),
  organization: v.string(),
  visitType: v.string(),
  checkInTime: v.string(),
})

/**
 * Lockup present data response schema
 */
export const LockupPresentDataResponseSchema = v.object({
  members: v.array(PresentMemberForLockupSchema),
  visitors: v.array(PresentVisitorForLockupSchema),
  totalCount: v.number(),
})

/**
 * Execute lockup request schema
 */
export const ExecuteLockupSchema = v.object({
  note: v.optional(v.string()),
})

/**
 * Execute lockup response schema
 */
export const ExecuteLockupResponseSchema = v.object({
  success: v.boolean(),
  message: v.string(),
  checkedOut: v.object({
    members: v.array(v.string()),
    visitors: v.array(v.string()),
  }),
  auditLogId: v.string(),
  stats: v.object({
    membersCheckedOut: v.number(),
    visitorsCheckedOut: v.number(),
    totalCheckedOut: v.number(),
  }),
})

/**
 * Check lockup authorization response schema
 */
export const CheckLockupAuthResponseSchema = v.object({
  authorized: v.boolean(),
  message: v.string(),
})

// Type exports - New types
export type BuildingStatus = v.InferOutput<typeof BuildingStatusSchema>
export type LockupHolder = v.InferOutput<typeof LockupHolderSchema>
export type LockupStatusResponse = v.InferOutput<typeof LockupStatusResponseSchema>
export type DateParam = v.InferOutput<typeof DateParamSchema>
export type TransferReason = v.InferOutput<typeof TransferReasonSchema>
export type TransferLockupInput = v.InferOutput<typeof TransferLockupSchema>
export type TransferLockupResponse = v.InferOutput<typeof TransferLockupResponseSchema>
export type CheckoutOption = v.InferOutput<typeof CheckoutOptionSchema>
export type EligibleRecipient = v.InferOutput<typeof EligibleRecipientSchema>
export type CheckoutOptionsResponse = v.InferOutput<typeof CheckoutOptionsResponseSchema>
export type LockupTransferHistory = v.InferOutput<typeof LockupTransferHistorySchema>
export type LockupExecutionHistory = v.InferOutput<typeof LockupExecutionHistorySchema>
export type LockupHistoryItem = v.InferOutput<typeof LockupHistoryItemSchema>
export type LockupHistoryQuery = v.InferOutput<typeof LockupHistoryQuerySchema>
export type LockupHistoryResponse = v.InferOutput<typeof LockupHistoryResponseSchema>

// Type exports - Existing types
export type PresentMemberForLockup = v.InferOutput<typeof PresentMemberForLockupSchema>
export type PresentVisitorForLockup = v.InferOutput<typeof PresentVisitorForLockupSchema>
export type LockupPresentDataResponse = v.InferOutput<typeof LockupPresentDataResponseSchema>
export type ExecuteLockupInput = v.InferOutput<typeof ExecuteLockupSchema>
export type ExecuteLockupResponse = v.InferOutput<typeof ExecuteLockupResponseSchema>
export type CheckLockupAuthResponse = v.InferOutput<typeof CheckLockupAuthResponseSchema>
