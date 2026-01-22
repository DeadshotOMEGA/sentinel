import * as v from 'valibot'

/**
 * List type enum - defines the valid list types
 */
export const ListTypeEnum = v.picklist(
  ['event_role', 'rank', 'mess', 'moc'],
  'List type must be one of: event_role, rank, mess, moc'
)

/**
 * Code transformation: trim, lowercase, replace spaces and hyphens with underscores
 */
const normalizeCode = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s-]+/g, '_')

/**
 * Create list item request schema
 */
export const CreateListItemSchema = v.object({
  code: v.pipe(
    v.string('Code is required'),
    v.minLength(1, 'Code cannot be empty'),
    v.maxLength(50, 'Code must be at most 50 characters'),
    v.transform(normalizeCode)
  ),
  name: v.pipe(
    v.string('Name is required'),
    v.minLength(1, 'Name cannot be empty'),
    v.maxLength(200, 'Name must be at most 200 characters'),
    v.transform((val) => val.trim())
  ),
  displayOrder: v.optional(v.number('Display order must be a number')),
  description: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, 'Description must be at most 500 characters')
    )
  ),
  isSystem: v.optional(v.boolean(), false),
})

/**
 * Update list item request schema
 * All fields are optional for partial updates
 */
export const UpdateListItemSchema = v.object({
  code: v.optional(
    v.pipe(
      v.string('Code must be a string'),
      v.minLength(1, 'Code cannot be empty'),
      v.maxLength(50, 'Code must be at most 50 characters'),
      v.transform(normalizeCode)
    )
  ),
  name: v.optional(
    v.pipe(
      v.string('Name must be a string'),
      v.minLength(1, 'Name cannot be empty'),
      v.maxLength(200, 'Name must be at most 200 characters'),
      v.transform((val) => val.trim())
    )
  ),
  displayOrder: v.optional(v.number('Display order must be a number')),
  description: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, 'Description must be at most 500 characters')
    )
  ),
})

/**
 * Reorder list items request schema
 */
export const ReorderListItemsSchema = v.object({
  itemIds: v.pipe(
    v.array(v.pipe(v.string(), v.uuid('Each item ID must be a valid UUID'))),
    v.minLength(1, 'At least one item ID is required')
  ),
})

/**
 * List item response schema (with usage count)
 */
export const ListItemResponseSchema = v.object({
  id: v.string(),
  listType: ListTypeEnum,
  code: v.string(),
  name: v.string(),
  displayOrder: v.number(),
  description: v.nullable(v.string()),
  isSystem: v.boolean(),
  usageCount: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * List items response schema (array of items)
 */
export const ListItemsResponseSchema = v.object({
  items: v.array(ListItemResponseSchema),
})

/**
 * Usage count response schema
 */
export const UsageCountResponseSchema = v.object({
  usageCount: v.number(),
})

/**
 * List type path parameter schema
 */
export const ListTypeParamSchema = v.object({
  listType: ListTypeEnum,
})

/**
 * Type exports
 */
export type ListType = v.InferOutput<typeof ListTypeEnum>
export type CreateListItemInput = v.InferInput<typeof CreateListItemSchema>
export type CreateListItem = v.InferOutput<typeof CreateListItemSchema>
export type UpdateListItemInput = v.InferInput<typeof UpdateListItemSchema>
export type UpdateListItem = v.InferOutput<typeof UpdateListItemSchema>
export type ReorderListItems = v.InferOutput<typeof ReorderListItemsSchema>
export type ListItemResponse = v.InferOutput<typeof ListItemResponseSchema>
export type ListItemsResponse = v.InferOutput<typeof ListItemsResponseSchema>
export type UsageCountResponse = v.InferOutput<typeof UsageCountResponseSchema>
export type ListTypeParam = v.InferOutput<typeof ListTypeParamSchema>
