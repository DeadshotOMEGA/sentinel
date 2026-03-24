import type {
  DutyWatchRule,
  IsoWeekday,
  LocalDate,
  OperationalTimingsSettings,
  OperationalTimingsSource,
  OperationalAlertRateLimitKey,
  SecurityAlertRateLimitKey,
} from '@sentinel/contracts'
import { getDutyWatchOccurrenceForDate } from '@sentinel/contracts'

export const DEFAULT_BACKEND_TIMEZONE = process.env.TIMEZONE || 'America/Winnipeg'

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const DEFAULT_OPERATIONAL_ALERT_RATE_LIMIT: Record<
  OperationalAlertRateLimitKey,
  { threshold: number; timeWindowMinutes: number }
> = {
  lockup_reminder: { threshold: 1, timeWindowMinutes: 60 },
  lockup_not_executed: { threshold: 1, timeWindowMinutes: 60 },
  duty_watch_missing: { threshold: 1, timeWindowMinutes: 60 },
  duty_watch_not_checked_in: { threshold: 1, timeWindowMinutes: 60 },
  building_not_secured: { threshold: 1, timeWindowMinutes: 60 },
  member_missed_checkout: { threshold: 1, timeWindowMinutes: 60 },
}

const DEFAULT_SECURITY_ALERT_RATE_LIMIT: Record<
  SecurityAlertRateLimitKey,
  { threshold: number; timeWindowMinutes: number }
> = {
  badge_disabled: { threshold: 1, timeWindowMinutes: 60 },
  badge_unknown: { threshold: 1, timeWindowMinutes: 60 },
  inactive_member: { threshold: 1, timeWindowMinutes: 60 },
  unauthorized_access: { threshold: 1, timeWindowMinutes: 60 },
}

function cloneSettings(settings: OperationalTimingsSettings): OperationalTimingsSettings {
  return deepClone(settings)
}

const LEGACY_DUTY_WATCH_ANCHOR_MONDAY = '2026-01-05'

function addDaysToLocalDate(date: string, days: number): string {
  const [yearText, monthText, dayText] = date.split('-')
  const next = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)))
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function createDefaultDutyWatchRule(
  id: string,
  name: string,
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7
): DutyWatchRule {
  return {
    id,
    name,
    effectiveStartDate: addDaysToLocalDate(
      LEGACY_DUTY_WATCH_ANCHOR_MONDAY,
      weekday - 1
    ) as LocalDate,
    startTime: process.env.DUTY_WATCH_ALERT_TIME || '19:00',
    endTime: process.env.DUTY_WATCH_ALERT_TIME || '19:00',
    recurrence: {
      type: 'weekly',
      weekday,
      intervalWeeks: 1,
    },
  }
}

function parseHourMinute(time: string): { hour: number; minute: number } {
  const [hourText, minuteText] = time.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`Invalid HH:MM time: ${time}`)
  }

  return { hour, minute }
}

export function toCompactMilitaryTime(time: string): string {
  const { hour, minute } = parseHourMinute(time)
  return `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`
}

export function isoWeekdayToCronDay(isoDay: IsoWeekday): string {
  return isoDay === 7 ? '0' : String(isoDay)
}

export function isoWeekdayListToCronDays(days: IsoWeekday[]): string {
  const uniqueSorted = [...new Set(days)].sort((left, right) => left - right)
  return uniqueSorted.map((day) => isoWeekdayToCronDay(day)).join(',')
}

export function jsWeekdayToIsoWeekday(day: number): IsoWeekday {
  return (day === 0 ? 7 : day) as IsoWeekday
}

export function getDefaultOperationalTimingsSettings(): OperationalTimingsSettings {
  return {
    operational: {
      dayRolloverTime: process.env.DAY_ROLLOVER_TIME || '03:00',
      lockupWarningTime: process.env.LOCKUP_WARNING_TIME || '22:00',
      lockupCriticalTime: process.env.LOCKUP_CRITICAL_TIME || '23:00',
      dutyWatchRules: [
        createDefaultDutyWatchRule('duty-watch-tuesday', 'Duty Watch', 2),
        createDefaultDutyWatchRule('duty-watch-thursday', 'Duty Watch', 4),
      ],
    },
    workingHours: {
      regularWeekdayStart: '08:00',
      regularWeekdayEnd: '16:00',
      regularWeekdays: [1, 2, 3, 4, 5],
      summerStartDate: '06-01',
      summerEndDate: '08-31',
      summerWeekdayStart: '08:00',
      summerWeekdayEnd: '15:00',
    },
    alertRateLimits: {
      operational: deepClone(DEFAULT_OPERATIONAL_ALERT_RATE_LIMIT),
      security: deepClone(DEFAULT_SECURITY_ALERT_RATE_LIMIT),
    },
  }
}

let runtimeSettings: OperationalTimingsSettings = getDefaultOperationalTimingsSettings()
let runtimeUpdatedAt: Date | null = null
let runtimeSource: OperationalTimingsSource = 'default'

export function applyOperationalTimingsRuntimeState(options: {
  settings: OperationalTimingsSettings
  source: OperationalTimingsSource
  updatedAt: Date | null
}): void {
  runtimeSettings = cloneSettings(options.settings)
  runtimeSource = options.source
  runtimeUpdatedAt = options.updatedAt
}

export function getOperationalTimingsRuntimeState(): {
  settings: OperationalTimingsSettings
  source: OperationalTimingsSource
  updatedAt: Date | null
} {
  return {
    settings: cloneSettings(runtimeSettings),
    source: runtimeSource,
    updatedAt: runtimeUpdatedAt,
  }
}

export function getRuntimeDayRolloverTime(): { hour: number; minute: number } {
  return parseHourMinute(runtimeSettings.operational.dayRolloverTime)
}

export function getRuntimeDutyWatchRules(): DutyWatchRule[] {
  return runtimeSettings.operational.dutyWatchRules.map((rule) => ({
    ...rule,
    recurrence: { ...rule.recurrence },
  }))
}

export function getRuntimeDutyWatchOccurrence(date: LocalDate) {
  return getDutyWatchOccurrenceForDate(runtimeSettings.operational.dutyWatchRules, date)
}

export function isRuntimeDutyWatchDate(date: LocalDate): boolean {
  return getRuntimeDutyWatchOccurrence(date) !== null
}

export function getRuntimeAlertRateLimit(
  alertType: string
): { threshold: number; timeWindowMinutes: number } | null {
  const operationalRule =
    runtimeSettings.alertRateLimits.operational[alertType as OperationalAlertRateLimitKey]
  if (operationalRule) {
    return { ...operationalRule }
  }

  const securityRule =
    runtimeSettings.alertRateLimits.security[alertType as SecurityAlertRateLimitKey]
  if (securityRule) {
    return { ...securityRule }
  }

  return null
}
