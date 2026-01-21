import * as v from 'valibot'

/**
 * Performed by type enum
 */
export const PerformedByTypeEnum = v.picklist(['admin', 'member', 'system'])

/**
 * Tag response schema
 */
export const TagResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
  description: v.nullable(v.string()),
  displayOrder: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Lockup holder response schema
 */
export const LockupHolderResponseSchema = v.object({
  id: v.string(),
  rank: v.string(),
  firstName: v.string(),
  lastName: v.string(),
})

/**
 * Transfer lockup tag request schema
 */
export const TransferLockupTagSchema = v.object({
  toMemberId: v.pipe(v.string('Target member ID is required'), v.uuid('Invalid member ID')),
  performedBy: v.pipe(v.string('Performer ID is required'), v.uuid('Invalid performer ID')),
  performedByType: PerformedByTypeEnum,
  notes: v.optional(v.string()),
})

/**
 * Transfer lockup tag response schema
 */
export const TransferLockupTagResponseSchema = v.object({
  success: v.boolean(),
  previousHolder: v.nullable(LockupHolderResponseSchema),
  newHolder: LockupHolderResponseSchema,
})

/**
 * Get lockup holder response schema
 */
export const GetLockupHolderResponseSchema = v.object({
  holder: v.nullable(LockupHolderResponseSchema),
})

// Type exports
export type TagResponse = v.InferOutput<typeof TagResponseSchema>
export type LockupHolderResponse = v.InferOutput<typeof LockupHolderResponseSchema>
export type TransferLockupTagInput = v.InferOutput<typeof TransferLockupTagSchema>
export type TransferLockupTagResponse = v.InferOutput<typeof TransferLockupTagResponseSchema>
export type GetLockupHolderResponse = v.InferOutput<typeof GetLockupHolderResponseSchema>
