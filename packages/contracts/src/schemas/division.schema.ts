import * as v from 'valibot'

/**
 * Create division request schema
 */
export const CreateDivisionSchema = v.object({
  code: v.pipe(
    v.string('Division code is required'),
    v.minLength(1, 'Division code cannot be empty'),
    v.maxLength(10, 'Division code must be at most 10 characters'),
    v.toUpperCase()
  ),
  name: v.pipe(
    v.string('Division name is required'),
    v.minLength(1, 'Division name cannot be empty'),
    v.maxLength(100, 'Division name must be at most 100 characters')
  ),
  description: v.optional(v.string()),
  color: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    )
  ),
})

/**
 * Update division request schema
 */
export const UpdateDivisionSchema = v.object({
  code: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Division code cannot be empty'),
      v.maxLength(10, 'Division code must be at most 10 characters'),
      v.toUpperCase()
    )
  ),
  name: v.optional(
    v.pipe(
      v.string(),
      v.minLength(1, 'Division name cannot be empty'),
      v.maxLength(100, 'Division name must be at most 100 characters')
    )
  ),
  description: v.optional(v.string()),
  color: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    )
  ),
})

/**
 * Division response schema
 */
export const DivisionResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  color: v.nullable(v.string()),
  createdAt: v.nullable(v.string()),
  updatedAt: v.nullable(v.string()),
})

/**
 * Division with member count response schema
 */
export const DivisionWithStatsResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  name: v.string(),
  description: v.nullable(v.string()),
  color: v.nullable(v.string()),
  memberCount: v.number(),
  presentCount: v.number(),
  createdAt: v.nullable(v.string()),
  updatedAt: v.nullable(v.string()),
})

/**
 * Division list query parameters
 */
export const DivisionListQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
  search: v.optional(v.string()),
  includeStats: v.optional(v.pipe(v.string(), v.transform((val) => val === 'true'))),
})

/**
 * Division list response schema
 */
export const DivisionListResponseSchema = v.object({
  divisions: v.array(DivisionResponseSchema),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
})

/**
 * Type exports
 */
export type CreateDivisionInput = v.InferOutput<typeof CreateDivisionSchema>
export type UpdateDivisionInput = v.InferOutput<typeof UpdateDivisionSchema>
export type DivisionResponse = v.InferOutput<typeof DivisionResponseSchema>
export type DivisionWithStatsResponse = v.InferOutput<typeof DivisionWithStatsResponseSchema>
export type DivisionListQuery = v.InferOutput<typeof DivisionListQuerySchema>
export type DivisionListResponse = v.InferOutput<typeof DivisionListResponseSchema>
