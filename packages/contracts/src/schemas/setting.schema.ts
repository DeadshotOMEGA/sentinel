import * as v from 'valibot'

/**
 * Setting category values
 */
export const SettingCategoryEnum = v.picklist([
  'system',
  'feature_flags',
  'app_config',
  'notifications',
  'security',
  'integrations',
])

/**
 * Create setting request schema
 */
export const CreateSettingSchema = v.object({
  key: v.pipe(
    v.string('Setting key is required'),
    v.minLength(1, 'Setting key cannot be empty'),
    v.maxLength(100, 'Setting key must be at most 100 characters'),
    v.regex(/^[a-z0-9_.-]+$/, 'Setting key must contain only lowercase letters, numbers, underscores, dots, and hyphens')
  ),
  value: v.unknown(), // JSON value - any type allowed
  category: v.optional(SettingCategoryEnum),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters'))
  ),
})

/**
 * Update setting request schema (value only)
 */
export const UpdateSettingSchema = v.object({
  value: v.unknown(), // JSON value - any type allowed
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Description must be at most 500 characters'))
  ),
})

/**
 * Setting response schema
 */
export const SettingResponseSchema = v.object({
  id: v.string(),
  key: v.string(),
  value: v.unknown(),
  category: v.string(),
  description: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Setting list query parameters
 */
export const SettingListQuerySchema = v.object({
  category: v.optional(SettingCategoryEnum),
  search: v.optional(v.string()),
})

/**
 * Setting list response schema
 */
export const SettingListResponseSchema = v.object({
  settings: v.array(SettingResponseSchema),
  total: v.number(),
})

/**
 * Setting key parameter schema
 */
export const SettingKeyParamSchema = v.object({
  key: v.pipe(
    v.string('Setting key is required'),
    v.minLength(1, 'Setting key cannot be empty')
  ),
})

/**
 * Type exports
 */
export type CreateSettingInput = v.InferOutput<typeof CreateSettingSchema>
export type UpdateSettingInput = v.InferOutput<typeof UpdateSettingSchema>
export type SettingResponse = v.InferOutput<typeof SettingResponseSchema>
export type SettingListQuery = v.InferOutput<typeof SettingListQuerySchema>
export type SettingListResponse = v.InferOutput<typeof SettingListResponseSchema>
export type SettingKeyParam = v.InferOutput<typeof SettingKeyParamSchema>
export type SettingCategory = v.InferOutput<typeof SettingCategoryEnum>
