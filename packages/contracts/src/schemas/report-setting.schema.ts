import * as v from 'valibot'

/**
 * Day of week enum
 */
export const DayOfWeekEnum = v.picklist(
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  'Invalid day of week'
)

/**
 * Date format enum
 */
export const DateFormatEnum = v.picklist(
  ['DD MMM YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'],
  'Invalid date format'
)

/**
 * Page size enum
 */
export const PageSizeEnum = v.picklist(['letter', 'a4'], 'Invalid page size')

/**
 * Sort order enum
 */
export const SortOrderEnum = v.picklist(
  ['division_rank', 'rank', 'alphabetical'],
  'Invalid sort order'
)

/**
 * Schedule settings value schema
 */
export const ScheduleSettingsValueSchema = v.object({
  trainingNightDay: DayOfWeekEnum,
  trainingNightStart: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
  trainingNightEnd: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
  adminNightDay: DayOfWeekEnum,
  adminNightStart: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
  adminNightEnd: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
})
export type ScheduleSettingsValue = v.InferOutput<typeof ScheduleSettingsValueSchema>

/**
 * Working hours settings value schema
 */
export const WorkingHoursSettingsValueSchema = v.object({
  regularWeekdayStart: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
  regularWeekdayEnd: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
  regularWeekdays: v.array(DayOfWeekEnum),
  summerStartDate: v.pipe(
    v.string(),
    v.regex(/^\d{2}-\d{2}$/, 'Date must be in MM-DD format')
  ),
  summerEndDate: v.pipe(
    v.string(),
    v.regex(/^\d{2}-\d{2}$/, 'Date must be in MM-DD format')
  ),
  summerWeekdayStart: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
  summerWeekdayEnd: v.pipe(
    v.string(),
    v.regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  ),
})
export type WorkingHoursSettingsValue = v.InferOutput<
  typeof WorkingHoursSettingsValueSchema
>

/**
 * Threshold settings value schema
 */
export const ThresholdSettingsValueSchema = v.pipe(
  v.object({
    warningThreshold: v.pipe(
      v.number('Warning threshold must be a number'),
      v.minValue(0, 'Warning threshold must be at least 0'),
      v.maxValue(100, 'Warning threshold must be at most 100')
    ),
    criticalThreshold: v.pipe(
      v.number('Critical threshold must be a number'),
      v.minValue(0, 'Critical threshold must be at least 0'),
      v.maxValue(100, 'Critical threshold must be at most 100')
    ),
    showThresholdFlags: v.boolean(),
    bmqSeparateThresholds: v.boolean(),
    bmqWarningThreshold: v.pipe(
      v.number('BMQ warning threshold must be a number'),
      v.minValue(0, 'BMQ warning threshold must be at least 0'),
      v.maxValue(100, 'BMQ warning threshold must be at most 100')
    ),
    bmqCriticalThreshold: v.pipe(
      v.number('BMQ critical threshold must be a number'),
      v.minValue(0, 'BMQ critical threshold must be at least 0'),
      v.maxValue(100, 'BMQ critical threshold must be at most 100')
    ),
  }),
  v.check(
    (data) => data.warningThreshold > data.criticalThreshold,
    'Warning threshold must be greater than critical threshold'
  )
)
export type ThresholdSettingsValue = v.InferOutput<typeof ThresholdSettingsValueSchema>

/**
 * Member handling settings value schema
 */
export const MemberHandlingSettingsValueSchema = v.object({
  newMemberGracePeriod: v.pipe(
    v.number('New member grace period must be a number'),
    v.minValue(0, 'New member grace period must be at least 0'),
    v.maxValue(52, 'New member grace period must be at most 52 weeks')
  ),
  minimumTrainingNights: v.pipe(
    v.number('Minimum training nights must be a number'),
    v.minValue(1, 'Minimum training nights must be at least 1'),
    v.maxValue(20, 'Minimum training nights must be at most 20')
  ),
  includeFTStaff: v.boolean(),
  showBMQBadge: v.boolean(),
  showTrendIndicators: v.boolean(),
})
export type MemberHandlingSettingsValue = v.InferOutput<
  typeof MemberHandlingSettingsValueSchema
>

/**
 * Formatting settings value schema
 */
export const FormattingSettingsValueSchema = v.object({
  defaultSortOrder: SortOrderEnum,
  showServiceNumber: v.boolean(),
  dateFormat: DateFormatEnum,
  pageSize: PageSizeEnum,
})
export type FormattingSettingsValue = v.InferOutput<typeof FormattingSettingsValueSchema>

/**
 * Report setting response schema
 */
export const ReportSettingResponseSchema = v.object({
  key: v.string(),
  value: v.unknown(), // JSON value, type depends on key
  updatedAt: v.string(), // ISO timestamp
})
export type ReportSettingResponse = v.InferOutput<typeof ReportSettingResponseSchema>

/**
 * All settings response schema
 */
export const AllReportSettingsResponseSchema = v.object({
  settings: v.record(
    v.string(),
    v.object({
      value: v.unknown(),
      updatedAt: v.string(),
    })
  ),
})
export type AllReportSettingsResponse = v.InferOutput<
  typeof AllReportSettingsResponseSchema
>

/**
 * Update setting request schema
 */
export const UpdateReportSettingSchema = v.object({
  value: v.unknown(), // Validated against category schema in route
})
export type UpdateReportSetting = v.InferOutput<typeof UpdateReportSettingSchema>

/**
 * Bulk update settings request schema
 */
export const BulkUpdateReportSettingsSchema = v.object({
  settings: v.record(v.string(), v.unknown()),
})
export type BulkUpdateReportSettings = v.InferOutput<typeof BulkUpdateReportSettingsSchema>

/**
 * Bulk update response schema
 */
export const BulkUpdateReportSettingsResponseSchema = v.object({
  success: v.boolean(),
  updated: v.array(v.string()),
  message: v.string(),
})
export type BulkUpdateReportSettingsResponse = v.InferOutput<
  typeof BulkUpdateReportSettingsResponseSchema
>

/**
 * Path parameter schema
 */
export const ReportSettingKeyParamSchema = v.object({
  key: v.string(),
})
export type ReportSettingKeyParam = v.InferOutput<typeof ReportSettingKeyParamSchema>

/**
 * Generic error response schema
 */
export const ReportSettingErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})
export type ReportSettingErrorResponse = v.InferOutput<
  typeof ReportSettingErrorResponseSchema
>
