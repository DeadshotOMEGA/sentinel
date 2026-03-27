/**
 * Operational Date Utilities
 *
 * Handles the concept of an "operational day" that rolls over at a configured
 * HH:MM local time instead of midnight.
 */

import { isDutyWatchActiveOnDate, type DutyWatchRule, type LocalDate } from '@sentinel/contracts'
import { DateTime } from 'luxon'
import {
  DEFAULT_BACKEND_TIMEZONE,
  getDefaultOperationalTimingsSettings,
  getOperationalTimingsRuntimeState,
} from '../lib/operational-timings-runtime.js'

// Default timezone for HMCS Chippawa
export const DEFAULT_TIMEZONE = DEFAULT_BACKEND_TIMEZONE

// Kept for backward compatibility with existing imports.
// Runtime logic now uses configurable day rollover time.
export const OPERATIONAL_DAY_START_HOUR = Number(
  getDefaultOperationalTimingsSettings().operational.dayRolloverTime.split(':')[0] || '3'
)

/**
 * Configuration for operational date calculations
 */
export interface OperationalDateConfig {
  timezone?: string
  dayStartHour?: number
  dayStartTime?: string
  dutyWatchRules?: DutyWatchRule[]
}

function parseTime(time: string): { hour: number; minute: number } {
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

function resolveDayStart(config: OperationalDateConfig): { hour: number; minute: number } {
  if (config.dayStartTime) {
    return parseTime(config.dayStartTime)
  }

  if (typeof config.dayStartHour === 'number') {
    return {
      hour: config.dayStartHour,
      minute: 0,
    }
  }

  const runtime = getOperationalTimingsRuntimeState().settings
  return parseTime(runtime.operational.dayRolloverTime)
}

function resolveDutyWatchRules(config: OperationalDateConfig): DutyWatchRule[] {
  if (Array.isArray(config.dutyWatchRules) && config.dutyWatchRules.length > 0) {
    return config.dutyWatchRules
  }
  return getOperationalTimingsRuntimeState().settings.operational.dutyWatchRules
}

function toRolloverDateTime(dt: DateTime, dayStart: { hour: number; minute: number }): DateTime {
  return dt.set({
    hour: dayStart.hour,
    minute: dayStart.minute,
    second: 0,
    millisecond: 0,
  })
}

export function getOperationalDayStartTime(config: OperationalDateConfig = {}): {
  hour: number
  minute: number
} {
  return resolveDayStart(config)
}

/**
 * Get the current operational date based on configured rollover time.
 */
export function getOperationalDate(timestamp?: Date, config: OperationalDateConfig = {}): Date {
  const { timezone = DEFAULT_TIMEZONE } = config
  const dayStart = resolveDayStart(config)

  const dt = timestamp
    ? DateTime.fromJSDate(timestamp, { zone: timezone })
    : DateTime.now().setZone(timezone)

  const rollover = toRolloverDateTime(dt, dayStart)

  if (dt < rollover) {
    return dt.minus({ days: 1 }).startOf('day').toJSDate()
  }

  return dt.startOf('day').toJSDate()
}

/**
 * Get the operational week boundaries (Monday to Monday)
 */
export function getOperationalWeek(
  date?: Date,
  config: OperationalDateConfig = {}
): { start: Date; end: Date } {
  const { timezone = DEFAULT_TIMEZONE } = config
  const operationalDate = getOperationalDate(date, config)
  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  const weekStart = dt.startOf('week')
  const weekEnd = weekStart.plus({ weeks: 1 })

  return {
    start: weekStart.toJSDate(),
    end: weekEnd.toJSDate(),
  }
}

/**
 * Check if the operational date matches a specific day of week
 */
export function isOperationalDay(
  date: Date,
  dayOfWeek: number,
  config: OperationalDateConfig = {}
): boolean {
  const { timezone = DEFAULT_TIMEZONE } = config

  const operationalDate = getOperationalDate(date, config)
  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  return dt.weekday === dayOfWeek
}

/**
 * Check if the current operational date is a configured Duty Watch night.
 */
export function isDutyWatchNight(date?: Date, config: OperationalDateConfig = {}): boolean {
  const { timezone = DEFAULT_TIMEZONE } = config
  const dutyWatchRules = resolveDutyWatchRules(config)

  const operationalDate = getOperationalDate(date, config)
  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  return isDutyWatchActiveOnDate(dutyWatchRules, dt.toISODate() as LocalDate)
}

/**
 * Get the time until the next configured rollover.
 */
export function getTimeUntilRollover(config: OperationalDateConfig = {}): number {
  const { timezone = DEFAULT_TIMEZONE } = config
  const dayStart = resolveDayStart(config)

  const now = DateTime.now().setZone(timezone)
  let nextRollover = toRolloverDateTime(now, dayStart)

  if (now >= nextRollover) {
    nextRollover = nextRollover.plus({ days: 1 })
  }

  return nextRollover.diff(now).milliseconds
}

/**
 * Format an operational date for display
 */
export function formatOperationalDate(date: Date, config: OperationalDateConfig = {}): string {
  const { timezone = DEFAULT_TIMEZONE } = config

  const dt = DateTime.fromJSDate(date, { zone: timezone })
  return dt.toFormat('EEEE, MMMM d, yyyy')
}

/**
 * Get the operational date as an ISO date string (YYYY-MM-DD)
 */
export function getOperationalDateISO(date?: Date, config: OperationalDateConfig = {}): string {
  const { timezone = DEFAULT_TIMEZONE } = config

  const operationalDate = getOperationalDate(date, config)
  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  return dt.toISODate()!
}

/**
 * Parse an ISO date string as an operational date
 */
export function parseOperationalDate(isoDate: string, config: OperationalDateConfig = {}): Date {
  const { timezone = DEFAULT_TIMEZONE } = config

  const dt = DateTime.fromISO(isoDate, { zone: timezone })
  if (!dt.isValid) {
    throw new Error(`Invalid ISO date: ${isoDate}`)
  }

  return dt.startOf('day').toJSDate()
}

/**
 * Check if a given time is before operational rollover for that date.
 */
export function isInRolloverPeriod(date?: Date, config: OperationalDateConfig = {}): boolean {
  const { timezone = DEFAULT_TIMEZONE } = config
  const dayStart = resolveDayStart(config)

  const dt = date ? DateTime.fromJSDate(date, { zone: timezone }) : DateTime.now().setZone(timezone)

  const rollover = toRolloverDateTime(dt, dayStart)
  return dt < rollover
}

/**
 * Get detailed information about the current operational state
 */
export function getOperationalStatus(config: OperationalDateConfig = {}): {
  operationalDate: Date
  operationalDateISO: string
  operationalDateFormatted: string
  calendarDate: Date
  calendarDateISO: string
  isDifferentFromCalendar: boolean
  isInRolloverPeriod: boolean
  isDutyWatchNight: boolean
  msUntilRollover: number
  timezone: string
} {
  const { timezone = DEFAULT_TIMEZONE } = config

  const now = DateTime.now().setZone(timezone)
  const operationalDate = getOperationalDate(undefined, config)
  const operationalDt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  return {
    operationalDate,
    operationalDateISO: operationalDt.toISODate()!,
    operationalDateFormatted: formatOperationalDate(operationalDate, config),
    calendarDate: now.startOf('day').toJSDate(),
    calendarDateISO: now.toISODate()!,
    isDifferentFromCalendar: operationalDt.toISODate() !== now.toISODate(),
    isInRolloverPeriod: isInRolloverPeriod(undefined, config),
    isDutyWatchNight: isDutyWatchNight(undefined, config),
    msUntilRollover: getTimeUntilRollover(config),
    timezone,
  }
}
