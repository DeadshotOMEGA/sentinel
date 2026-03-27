import * as v from 'valibot'

const TIME_REGEX = /^\d{2}:\d{2}$/
const MONTH_DAY_REGEX = /^\d{2}-\d{2}$/
const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const IsoWeekdaySchema = v.pipe(
  v.number('Weekday is required'),
  v.integer('Weekday must be an integer'),
  v.minValue(1, 'Weekday must be between 1 and 7'),
  v.maxValue(7, 'Weekday must be between 1 and 7')
)
export type IsoWeekday = v.InferOutput<typeof IsoWeekdaySchema>

export const TimeOfDaySchema = v.pipe(
  v.string('Time is required'),
  v.regex(TIME_REGEX, 'Time must be in HH:MM format'),
  v.check((time) => {
    const [hoursText, minutesText] = time.split(':')
    const hours = Number(hoursText)
    const minutes = Number(minutesText)
    return (
      Number.isInteger(hours) &&
      Number.isInteger(minutes) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    )
  }, 'Time must be a valid 24-hour time')
)
export type TimeOfDay = v.InferOutput<typeof TimeOfDaySchema>

export const MonthDaySchema = v.pipe(
  v.string('Date is required'),
  v.regex(MONTH_DAY_REGEX, 'Date must be in MM-DD format'),
  v.check((value) => {
    const [monthText, dayText] = value.split('-')
    const month = Number(monthText)
    const day = Number(dayText)

    if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) {
      return false
    }

    const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return day <= maxDays[month - 1]!
  }, 'Date must be a valid MM-DD value')
)
export type MonthDay = v.InferOutput<typeof MonthDaySchema>

export const LocalDateSchema = v.pipe(
  v.string('Date is required'),
  v.regex(LOCAL_DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
  v.check((value) => {
    const [yearText, monthText, dayText] = value.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1
    ) {
      return false
    }

    const utcDate = new Date(Date.UTC(year, month - 1, day))
    return (
      utcDate.getUTCFullYear() === year &&
      utcDate.getUTCMonth() === month - 1 &&
      utcDate.getUTCDate() === day
    )
  }, 'Date must be a valid YYYY-MM-DD value')
)
export type LocalDate = v.InferOutput<typeof LocalDateSchema>

const UniqueWeekdaysSchema = v.pipe(
  v.array(IsoWeekdaySchema),
  v.minLength(1, 'At least one weekday is required'),
  v.check((days) => new Set(days).size === days.length, 'Weekdays must be unique')
)

export const DutyWatchMonthlyOrdinalSchema = v.picklist(
  ['first', 'second', 'third', 'fourth', 'last'],
  'Ordinal must be first, second, third, fourth, or last'
)
export type DutyWatchMonthlyOrdinal = v.InferOutput<typeof DutyWatchMonthlyOrdinalSchema>

export const DutyWatchWeeklyRecurrenceSchema = v.object({
  type: v.literal('weekly'),
  weekday: IsoWeekdaySchema,
  intervalWeeks: v.pipe(
    v.number('Week interval is required'),
    v.integer('Week interval must be an integer'),
    v.minValue(1, 'Week interval must be at least 1'),
    v.maxValue(52, 'Week interval must be at most 52')
  ),
})
export type DutyWatchWeeklyRecurrence = v.InferOutput<typeof DutyWatchWeeklyRecurrenceSchema>

export const DutyWatchMonthlyNthWeekdayRecurrenceSchema = v.object({
  type: v.literal('monthly_nth_weekday'),
  weekday: IsoWeekdaySchema,
  ordinal: DutyWatchMonthlyOrdinalSchema,
})
export type DutyWatchMonthlyNthWeekdayRecurrence = v.InferOutput<
  typeof DutyWatchMonthlyNthWeekdayRecurrenceSchema
>

export const DutyWatchRecurrenceSchema = v.variant('type', [
  DutyWatchWeeklyRecurrenceSchema,
  DutyWatchMonthlyNthWeekdayRecurrenceSchema,
])
export type DutyWatchRecurrence = v.InferOutput<typeof DutyWatchRecurrenceSchema>

export const DutyWatchRuleSchema = v.object({
  id: v.pipe(v.string('Rule id is required'), v.minLength(1, 'Rule id is required')),
  name: v.pipe(v.string('Rule name is required'), v.minLength(1, 'Rule name is required')),
  effectiveStartDate: LocalDateSchema,
  startTime: TimeOfDaySchema,
  endTime: TimeOfDaySchema,
  recurrence: DutyWatchRecurrenceSchema,
})
export type DutyWatchRule = v.InferOutput<typeof DutyWatchRuleSchema>

const DutyWatchRulesSchema = v.pipe(
  v.array(DutyWatchRuleSchema),
  v.minLength(1, 'At least one Duty Watch rule is required'),
  v.check(
    (rules) => new Set(rules.map((rule) => rule.id)).size === rules.length,
    'Duty Watch rule ids must be unique'
  )
)

function compareMonthDay(left: string, right: string): number {
  const [leftMonthText, leftDayText] = left.split('-')
  const [rightMonthText, rightDayText] = right.split('-')

  const leftMonth = Number(leftMonthText)
  const leftDay = Number(leftDayText)
  const rightMonth = Number(rightMonthText)
  const rightDay = Number(rightDayText)

  if (leftMonth !== rightMonth) {
    return leftMonth - rightMonth
  }
  return leftDay - rightDay
}

export const OperationalAlertRateLimitKeys = [
  'lockup_reminder',
  'lockup_not_executed',
  'duty_watch_missing',
  'duty_watch_not_checked_in',
  'building_not_secured',
  'member_missed_checkout',
] as const
export type OperationalAlertRateLimitKey = (typeof OperationalAlertRateLimitKeys)[number]

export const SecurityAlertRateLimitKeys = [
  'badge_disabled',
  'badge_unknown',
  'inactive_member',
  'unauthorized_access',
] as const
export type SecurityAlertRateLimitKey = (typeof SecurityAlertRateLimitKeys)[number]

export const AlertRateLimitRuleSchema = v.object({
  threshold: v.pipe(
    v.number('Threshold is required'),
    v.integer('Threshold must be an integer'),
    v.minValue(1, 'Threshold must be at least 1'),
    v.maxValue(1000, 'Threshold must be at most 1000')
  ),
  timeWindowMinutes: v.pipe(
    v.number('Time window is required'),
    v.integer('Time window must be an integer'),
    v.minValue(1, 'Time window must be at least 1 minute'),
    v.maxValue(10080, 'Time window must be at most 10080 minutes')
  ),
})
export type AlertRateLimitRule = v.InferOutput<typeof AlertRateLimitRuleSchema>

export const OperationalAlertRateLimitsSchema = v.object({
  lockup_reminder: AlertRateLimitRuleSchema,
  lockup_not_executed: AlertRateLimitRuleSchema,
  duty_watch_missing: AlertRateLimitRuleSchema,
  duty_watch_not_checked_in: AlertRateLimitRuleSchema,
  building_not_secured: AlertRateLimitRuleSchema,
  member_missed_checkout: AlertRateLimitRuleSchema,
})
export type OperationalAlertRateLimits = v.InferOutput<typeof OperationalAlertRateLimitsSchema>

export const SecurityAlertRateLimitsSchema = v.object({
  badge_disabled: AlertRateLimitRuleSchema,
  badge_unknown: AlertRateLimitRuleSchema,
  inactive_member: AlertRateLimitRuleSchema,
  unauthorized_access: AlertRateLimitRuleSchema,
})
export type SecurityAlertRateLimits = v.InferOutput<typeof SecurityAlertRateLimitsSchema>

export const OperationalTimingsOperationalSettingsSchema = v.object({
  dayRolloverTime: TimeOfDaySchema,
  lockupWarningTime: TimeOfDaySchema,
  lockupCriticalTime: TimeOfDaySchema,
  dutyWatchRules: DutyWatchRulesSchema,
})
export type OperationalTimingsOperationalSettings = v.InferOutput<
  typeof OperationalTimingsOperationalSettingsSchema
>

export const LegacyOperationalTimingsOperationalSettingsSchema = v.object({
  dayRolloverTime: TimeOfDaySchema,
  lockupWarningTime: TimeOfDaySchema,
  lockupCriticalTime: TimeOfDaySchema,
  dutyWatchAlertTime: TimeOfDaySchema,
  dutyWatchDays: UniqueWeekdaysSchema,
})
export type LegacyOperationalTimingsOperationalSettings = v.InferOutput<
  typeof LegacyOperationalTimingsOperationalSettingsSchema
>

export const OperationalTimingsWorkingHoursSchema = v.pipe(
  v.object({
    regularWeekdayStart: TimeOfDaySchema,
    regularWeekdayEnd: TimeOfDaySchema,
    regularWeekdays: UniqueWeekdaysSchema,
    summerStartDate: MonthDaySchema,
    summerEndDate: MonthDaySchema,
    summerWeekdayStart: TimeOfDaySchema,
    summerWeekdayEnd: TimeOfDaySchema,
  }),
  v.check(
    (value) => compareMonthDay(value.summerStartDate, value.summerEndDate) <= 0,
    'Summer end date must be on or after summer start date'
  )
)
export type OperationalTimingsWorkingHours = v.InferOutput<
  typeof OperationalTimingsWorkingHoursSchema
>

export const OperationalTimingsAlertRateLimitsSchema = v.object({
  operational: OperationalAlertRateLimitsSchema,
  security: SecurityAlertRateLimitsSchema,
})
export type OperationalTimingsAlertRateLimits = v.InferOutput<
  typeof OperationalTimingsAlertRateLimitsSchema
>

export const OperationalTimingsSettingsSchema = v.object({
  operational: OperationalTimingsOperationalSettingsSchema,
  workingHours: OperationalTimingsWorkingHoursSchema,
  alertRateLimits: OperationalTimingsAlertRateLimitsSchema,
})
export type OperationalTimingsSettings = v.InferOutput<typeof OperationalTimingsSettingsSchema>

export const LegacyOperationalTimingsSettingsSchema = v.object({
  operational: LegacyOperationalTimingsOperationalSettingsSchema,
  workingHours: OperationalTimingsWorkingHoursSchema,
  alertRateLimits: OperationalTimingsAlertRateLimitsSchema,
})
export type LegacyOperationalTimingsSettings = v.InferOutput<
  typeof LegacyOperationalTimingsSettingsSchema
>

export const OperationalTimingsSourceSchema = v.picklist(
  ['default', 'stored', 'backfilled'],
  'Invalid settings source'
)
export type OperationalTimingsSource = v.InferOutput<typeof OperationalTimingsSourceSchema>

export const OperationalTimingsMetadataSchema = v.object({
  updatedAt: v.nullable(v.string()),
  source: OperationalTimingsSourceSchema,
})
export type OperationalTimingsMetadata = v.InferOutput<typeof OperationalTimingsMetadataSchema>

export const OperationalTimingsResponseSchema = v.object({
  settings: OperationalTimingsSettingsSchema,
  metadata: OperationalTimingsMetadataSchema,
})
export type OperationalTimingsResponse = v.InferOutput<typeof OperationalTimingsResponseSchema>

export const UpdateOperationalTimingsSchema = v.object({
  settings: OperationalTimingsSettingsSchema,
})
export type UpdateOperationalTimings = v.InferOutput<typeof UpdateOperationalTimingsSchema>

export const OperationalTimingsErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})
export type OperationalTimingsErrorResponse = v.InferOutput<
  typeof OperationalTimingsErrorResponseSchema
>
