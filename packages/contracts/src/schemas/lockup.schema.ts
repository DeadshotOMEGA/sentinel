import * as v from 'valibot'

/**
 * Present member for lockup schema
 */
export const PresentMemberForLockupSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  division: v.string(),
  divisionId: v.string(),
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

// Type exports
export type PresentMemberForLockup = v.InferOutput<typeof PresentMemberForLockupSchema>
export type PresentVisitorForLockup = v.InferOutput<typeof PresentVisitorForLockupSchema>
export type LockupPresentDataResponse = v.InferOutput<typeof LockupPresentDataResponseSchema>
export type ExecuteLockupInput = v.InferOutput<typeof ExecuteLockupSchema>
export type ExecuteLockupResponse = v.InferOutput<typeof ExecuteLockupResponseSchema>
export type CheckLockupAuthResponse = v.InferOutput<typeof CheckLockupAuthResponseSchema>
