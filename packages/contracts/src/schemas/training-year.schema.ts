import * as v from 'valibot'

/**
 * Day exception type enum
 */
export const DayExceptionTypeEnum = v.picklist(
  ['day_off', 'cancelled_training', 'cancelled_admin'],
  'Invalid day exception type'
)
export type DayExceptionType = v.InferOutput<typeof DayExceptionTypeEnum>

/**
 * Holiday exclusion schema (date range with name)
 */
export const HolidayExclusionSchema = v.object({
  start: v.pipe(
    v.string('Start date is required'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  ),
  end: v.pipe(
    v.string('End date is required'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  ),
  name: v.pipe(
    v.string('Holiday name is required'),
    v.minLength(1, 'Holiday name cannot be empty'),
    v.maxLength(100, 'Holiday name must be at most 100 characters')
  ),
})
export type HolidayExclusion = v.InferOutput<typeof HolidayExclusionSchema>

/**
 * Day exception schema (specific date with type)
 */
export const DayExceptionSchema = v.object({
  date: v.pipe(
    v.string('Date is required'),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  ),
  type: DayExceptionTypeEnum,
})
export type DayException = v.InferOutput<typeof DayExceptionSchema>

/**
 * Training year response schema
 */
export const TrainingYearResponseSchema = v.object({
  id: v.string(),
  name: v.string(),
  startDate: v.string(), // ISO date string
  endDate: v.string(), // ISO date string
  holidayExclusions: v.array(HolidayExclusionSchema),
  dayExceptions: v.array(DayExceptionSchema),
  isCurrent: v.boolean(),
  createdAt: v.string(), // ISO timestamp
  updatedAt: v.string(), // ISO timestamp
})
export type TrainingYearResponse = v.InferOutput<typeof TrainingYearResponseSchema>

/**
 * Training year list response schema
 */
export const TrainingYearListResponseSchema = v.object({
  trainingYears: v.array(TrainingYearResponseSchema),
})
export type TrainingYearListResponse = v.InferOutput<typeof TrainingYearListResponseSchema>

/**
 * Create training year schema
 */
export const CreateTrainingYearSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string('Training year name is required'),
      v.minLength(1, 'Training year name cannot be empty'),
      v.maxLength(50, 'Training year name must be at most 50 characters')
    ),
    startDate: v.pipe(
      v.string('Start date is required'),
      v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    ),
    endDate: v.pipe(
      v.string('End date is required'),
      v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    ),
    holidayExclusions: v.optional(v.array(HolidayExclusionSchema), []),
    dayExceptions: v.optional(v.array(DayExceptionSchema), []),
    isCurrent: v.optional(v.boolean(), false),
  }),
  v.check(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    'Start date must be before end date'
  )
)
export type CreateTrainingYear = v.InferOutput<typeof CreateTrainingYearSchema>

/**
 * Update training year schema
 */
export const UpdateTrainingYearSchema = v.pipe(
  v.object({
    name: v.optional(
      v.pipe(
        v.string(),
        v.minLength(1, 'Training year name cannot be empty'),
        v.maxLength(50, 'Training year name must be at most 50 characters')
      )
    ),
    startDate: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      )
    ),
    endDate: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      )
    ),
    holidayExclusions: v.optional(v.array(HolidayExclusionSchema)),
    dayExceptions: v.optional(v.array(DayExceptionSchema)),
    isCurrent: v.optional(v.boolean()),
  }),
  v.check(
    (data) => {
      // Only validate dates if both are present
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate)
      }
      return true
    },
    'Start date must be before end date'
  )
)
export type UpdateTrainingYear = v.InferOutput<typeof UpdateTrainingYearSchema>

/**
 * Path parameter schema for training year ID
 */
export const TrainingYearIdParamSchema = v.object({
  id: v.pipe(v.string(), v.uuid('Invalid training year ID format')),
})
export type TrainingYearIdParam = v.InferOutput<typeof TrainingYearIdParamSchema>

/**
 * Generic error response schema
 */
export const TrainingYearErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})
export type TrainingYearErrorResponse = v.InferOutput<typeof TrainingYearErrorResponseSchema>
