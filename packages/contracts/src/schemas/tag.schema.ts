import * as v from 'valibot'

/**
 * Member tag response schema (for member's assigned tags)
 */
export const MemberTagResponseSchema = v.object({
  id: v.string(),
  tagId: v.string(),
  memberId: v.string(),
  tag: v.object({
    id: v.string(),
    name: v.string(),
    description: v.nullable(v.string()),
    chipVariant: v.string(),
    chipColor: v.string(),
  }),
  createdAt: v.string(),
})

/**
 * Member tag list response schema
 */
export const MemberTagListResponseSchema = v.object({
  data: v.array(MemberTagResponseSchema),
})

/**
 * Assign tag input schema
 */
export const AssignTagInputSchema = v.object({
  tagId: v.pipe(v.string(), v.uuid('Invalid tag ID')),
})

/**
 * Member ID param schema for tags
 */
export const TagMemberIdParamSchema = v.object({
  memberId: v.pipe(v.string(), v.uuid('Invalid member ID')),
})

/**
 * Member tag ID param schema (for removing)
 */
export const MemberTagIdParamSchema = v.object({
  memberId: v.pipe(v.string(), v.uuid('Invalid member ID')),
  tagId: v.pipe(v.string(), v.uuid('Invalid tag ID')),
})

/**
 * Type exports
 */
export type MemberTagResponse = v.InferOutput<typeof MemberTagResponseSchema>
export type MemberTagListResponse = v.InferOutput<typeof MemberTagListResponseSchema>
export type AssignTagInput = v.InferOutput<typeof AssignTagInputSchema>
