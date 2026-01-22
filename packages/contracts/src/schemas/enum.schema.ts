import * as v from 'valibot'

/**
 * Code validation pattern - lowercase alphanumeric with underscores only
 */
const CodePattern = /^[a-z0-9_]+$/

/**
 * Base enum validation schema (shared across all enum types)
 */
export const CreateEnumSchema = v.object({
  code: v.pipe(
    v.string('Code is required'),
    v.minLength(1, 'Code cannot be empty'),
    v.maxLength(50, 'Code must be at most 50 characters'),
    v.regex(CodePattern, 'Code must be lowercase alphanumeric with underscores only')
  ),
  name: v.pipe(
    v.string('Name is required'),
    v.minLength(1, 'Name cannot be empty'),
    v.maxLength(100, 'Name must be at most 100 characters')
  ),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters'))
  ),
  color: v.optional(
    v.pipe(v.string(), v.maxLength(20, 'Color must be at most 20 characters'))
  ),
})

/**
 * Update enum schema (all fields optional)
 */
export const UpdateEnumSchema = v.object({
  code: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Code cannot be empty'),
      v.maxLength(50, 'Code must be at most 50 characters'),
      v.regex(CodePattern, 'Code must be lowercase alphanumeric with underscores only')
    )
  ),
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Name cannot be empty'),
      v.maxLength(100, 'Name must be at most 100 characters')
    )
  ),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters'))
  ),
  color: v.optional(
    v.pipe(v.string(), v.maxLength(20, 'Color must be at most 20 characters'))
  ),
})

/**
 * Enum response schema (includes usage count and metadata)
 */
export const EnumResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  color: v.optional(v.nullable(v.string())),
  usageCount: v.optional(v.number()),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Visit type list response schema
 */
export const VisitTypeListResponseSchema = v.object({
  visitTypes: v.array(EnumResponseSchema),
})

/**
 * Member status list response schema
 */
export const MemberStatusListResponseSchema = v.object({
  memberStatuses: v.array(EnumResponseSchema),
})

/**
 * Member type list response schema
 */
export const MemberTypeListResponseSchema = v.object({
  memberTypes: v.array(EnumResponseSchema),
})

/**
 * Badge status list response schema
 */
export const BadgeStatusListResponseSchema = v.object({
  badgeStatuses: v.array(EnumResponseSchema),
})

/**
 * Individual enum response schemas (for create/update operations)
 */
export const VisitTypeResponseSchema = v.object({
  visitType: EnumResponseSchema,
})

export const MemberStatusResponseSchema = v.object({
  memberStatus: EnumResponseSchema,
})

export const MemberTypeResponseSchema = v.object({
  memberType: EnumResponseSchema,
})

export const BadgeStatusResponseSchema = v.object({
  badgeStatus: EnumResponseSchema,
})

/**
 * Type exports
 */
export type CreateEnum = v.InferOutput<typeof CreateEnumSchema>
export type UpdateEnum = v.InferOutput<typeof UpdateEnumSchema>
export type EnumResponse = v.InferOutput<typeof EnumResponseSchema>
export type VisitTypeListResponse = v.InferOutput<typeof VisitTypeListResponseSchema>
export type MemberStatusListResponse = v.InferOutput<typeof MemberStatusListResponseSchema>
export type MemberTypeListResponse = v.InferOutput<typeof MemberTypeListResponseSchema>
export type BadgeStatusListResponse = v.InferOutput<typeof BadgeStatusListResponseSchema>
export type VisitTypeResponse = v.InferOutput<typeof VisitTypeResponseSchema>
export type MemberStatusResponse = v.InferOutput<typeof MemberStatusResponseSchema>
export type MemberTypeResponse = v.InferOutput<typeof MemberTypeResponseSchema>
export type BadgeStatusResponse = v.InferOutput<typeof BadgeStatusResponseSchema>
