import * as v from 'valibot'

// ============================================================================
// Stat Holiday Schemas
// ============================================================================

/**
 * Stat holiday response schema
 */
export const StatHolidaySchema = v.object({
  id: v.string(),
  date: v.string(), // ISO date string (YYYY-MM-DD)
  name: v.string(),
  province: v.nullable(v.string()), // null = federal, otherwise province code
  isActive: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
})

/**
 * Create stat holiday request schema
 */
export const CreateStatHolidaySchema = v.object({
  date: v.pipe(
    v.string(),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  ),
  name: v.pipe(v.string(), v.minLength(1, 'Name is required'), v.maxLength(100)),
  province: v.optional(v.nullable(v.string())),
  isActive: v.optional(v.boolean()),
})

/**
 * Update stat holiday request schema
 */
export const UpdateStatHolidaySchema = v.object({
  date: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'))
  ),
  name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  province: v.optional(v.nullable(v.string())),
  isActive: v.optional(v.boolean()),
})

/**
 * Stat holiday list response schema
 */
export const StatHolidayListResponseSchema = v.object({
  holidays: v.array(StatHolidaySchema),
  total: v.number(),
})

/**
 * Stat holiday query schema
 */
export const StatHolidayQuerySchema = v.object({
  year: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => parseInt(val, 10)),
      v.number(),
      v.minValue(2000),
      v.maxValue(2100)
    )
  ),
  province: v.optional(v.string()),
  activeOnly: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => val === 'true')
    )
  ),
})

/**
 * Check if date is holiday response schema
 */
export const IsHolidayResponseSchema = v.object({
  isHoliday: v.boolean(),
  holiday: v.nullable(StatHolidaySchema),
})

/**
 * Date param schema for holiday lookup
 */
export const HolidayDateParamSchema = v.object({
  date: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')),
})

// Type exports
export type StatHoliday = v.InferOutput<typeof StatHolidaySchema>
export type CreateStatHolidayInput = v.InferOutput<typeof CreateStatHolidaySchema>
export type UpdateStatHolidayInput = v.InferOutput<typeof UpdateStatHolidaySchema>
export type StatHolidayListResponse = v.InferOutput<typeof StatHolidayListResponseSchema>
export type StatHolidayQuery = v.InferOutput<typeof StatHolidayQuerySchema>
export type IsHolidayResponse = v.InferOutput<typeof IsHolidayResponseSchema>
