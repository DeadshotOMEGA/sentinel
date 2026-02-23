import * as v from 'valibot'

/**
 * Code validation pattern - lowercase alphanumeric with underscores only
 */
const CodePattern = /^[a-z0-9_]+$/

/**
 * Valid chip variants (matching HeroUI styles)
 */
export const ChipVariants = [
  'solid',
  'soft',
  'bordered',
  'light',
  'flat',
  'faded',
  'shadow',
  'dot',
] as const
export type ChipVariant = (typeof ChipVariants)[number]

/**
 * Valid chip colors (includes both semantic and base HeroUI colors)
 */
export const ChipColors = [
  // Semantic colors
  'default',
  'neutral',
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'info',
  'error',
  'danger',
  // Base colors
  'blue',
  'green',
  'pink',
  'purple',
  'red',
  'yellow',
  'cyan',
  'zinc',
] as const
export type ChipColor = (typeof ChipColors)[number]

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
  chipVariant: v.optional(v.picklist(ChipVariants, 'Invalid chip variant')),
  chipColor: v.optional(v.picklist(ChipColors, 'Invalid chip color')),
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
  chipVariant: v.optional(v.picklist(ChipVariants, 'Invalid chip variant')),
  chipColor: v.optional(v.picklist(ChipColors, 'Invalid chip color')),
})

/**
 * Enum response schema (includes usage count and metadata)
 */
export const EnumResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  chipVariant: v.optional(v.string()),
  chipColor: v.optional(v.string()),
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
 * Tag schemas (Tags use 'name' instead of 'code' and have displayOrder)
 */
export const CreateTagSchema = v.object({
  name: v.pipe(
    v.string('Name is required'),
    v.minLength(1, 'Name cannot be empty'),
    v.maxLength(100, 'Name must be at most 100 characters')
  ),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters'))
  ),
  chipVariant: v.optional(v.picklist(ChipVariants, 'Invalid chip variant')),
  chipColor: v.optional(v.picklist(ChipColors, 'Invalid chip color')),
  displayOrder: v.optional(v.number()),
  isPositional: v.optional(v.boolean()),
})

export const UpdateTagSchema = v.object({
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
  chipVariant: v.optional(v.picklist(ChipVariants, 'Invalid chip variant')),
  chipColor: v.optional(v.picklist(ChipColors, 'Invalid chip color')),
  displayOrder: v.optional(v.number()),
  isPositional: v.optional(v.boolean()),
})

export const TagResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  chipVariant: v.optional(v.string()),
  chipColor: v.optional(v.string()),
  displayOrder: v.optional(v.number()),
  isPositional: v.optional(v.boolean()),
  usageCount: v.optional(v.number()),
  createdAt: v.string(),
  updatedAt: v.string(),
})

export const TagListResponseSchema = v.object({
  tags: v.array(TagResponseSchema),
})

export const SingleTagResponseSchema = v.object({
  tag: TagResponseSchema,
})

/**
 * Reorder tags input schema
 */
export const ReorderTagsSchema = v.object({
  tagIds: v.pipe(
    v.array(v.pipe(v.string(), v.uuid('Invalid tag ID format'))),
    v.minLength(1, 'At least one tag ID is required')
  ),
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
export type CreateTag = v.InferOutput<typeof CreateTagSchema>
export type UpdateTag = v.InferOutput<typeof UpdateTagSchema>
export type TagResponse = v.InferOutput<typeof TagResponseSchema>
export type TagListResponse = v.InferOutput<typeof TagListResponseSchema>
export type SingleTagResponse = v.InferOutput<typeof SingleTagResponseSchema>
export type ReorderTags = v.InferOutput<typeof ReorderTagsSchema>
