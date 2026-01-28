/**
 * Operational Date Utilities
 *
 * Handles the concept of an "operational day" which runs from 3am to 3am
 * instead of midnight to midnight. This allows late-night events (finishing
 * at 1-2am) to be counted as part of the previous day's operations.
 *
 * Example: A Tuesday event running until 2am Wednesday is still "Tuesday"
 * operationally until 3am Wednesday.
 */

import { DateTime } from 'luxon'

// Default timezone for HMCS Chippawa
export const DEFAULT_TIMEZONE = 'America/Winnipeg'

// The hour at which a new operational day begins (3am)
export const OPERATIONAL_DAY_START_HOUR = 3

/**
 * Configuration for operational date calculations
 */
export interface OperationalDateConfig {
  timezone?: string
  dayStartHour?: number
}

/**
 * Get the current operational date based on 3am rollover
 *
 * If the current time is before 3am, the operational date is the previous
 * calendar day. This allows events running past midnight to still be
 * considered part of the previous day's operations.
 *
 * @param timestamp - The timestamp to calculate operational date for (defaults to now)
 * @param config - Configuration options (timezone, day start hour)
 * @returns The operational date as a Date object (midnight UTC of that day)
 *
 * @example
 * // At 2am on January 15, returns January 14 (still "yesterday" operationally)
 * getOperationalDate(new Date('2026-01-15T02:00:00'))
 *
 * // At 4am on January 15, returns January 15 (new operational day has started)
 * getOperationalDate(new Date('2026-01-15T04:00:00'))
 */
export function getOperationalDate(
  timestamp?: Date,
  config: OperationalDateConfig = {}
): Date {
  const { timezone = DEFAULT_TIMEZONE, dayStartHour = OPERATIONAL_DAY_START_HOUR } = config

  const dt = timestamp
    ? DateTime.fromJSDate(timestamp, { zone: timezone })
    : DateTime.now().setZone(timezone)

  // If current hour is before the operational day start hour,
  // the operational date is the previous calendar day
  if (dt.hour < dayStartHour) {
    return dt.minus({ days: 1 }).startOf('day').toJSDate()
  }

  return dt.startOf('day').toJSDate()
}

/**
 * Get the operational week boundaries (Monday to Monday)
 *
 * @param date - Any date within the week (defaults to now)
 * @param config - Configuration options
 * @returns Object containing the week start (Monday 00:00) and end (next Monday 00:00)
 *
 * @example
 * // For any date in the week of Jan 13-19, 2026:
 * getOperationalWeek(new Date('2026-01-15'))
 * // Returns: { start: Jan 13 00:00, end: Jan 20 00:00 }
 */
export function getOperationalWeek(
  date?: Date,
  config: OperationalDateConfig = {}
): { start: Date; end: Date } {
  const { timezone = DEFAULT_TIMEZONE } = config

  // First get the operational date for the timestamp
  const operationalDate = getOperationalDate(date, config)

  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  // Get the Monday of the current week
  // Luxon uses 1 for Monday, 7 for Sunday
  const weekStart = dt.startOf('week') // Luxon starts weeks on Monday by default

  // End is the next Monday (start of next week)
  const weekEnd = weekStart.plus({ weeks: 1 })

  return {
    start: weekStart.toJSDate(),
    end: weekEnd.toJSDate(),
  }
}

/**
 * Check if the operational date matches a specific day of week
 *
 * @param date - The date to check
 * @param dayOfWeek - Day of week (1=Monday, 7=Sunday)
 * @param config - Configuration options
 * @returns True if the operational date falls on the specified day
 *
 * @example
 * // Check if today is operationally a Tuesday (day 2)
 * isOperationalDay(new Date(), 2)
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
 * Check if the current operational date is a Duty Watch night (Tuesday or Thursday)
 *
 * @param date - The date to check (defaults to now)
 * @param config - Configuration options
 * @returns True if today is a Duty Watch night
 */
export function isDutyWatchNight(
  date?: Date,
  config: OperationalDateConfig = {}
): boolean {
  const { timezone = DEFAULT_TIMEZONE } = config

  const operationalDate = getOperationalDate(date, config)
  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  // Tuesday (2) or Thursday (4)
  return dt.weekday === 2 || dt.weekday === 4
}

/**
 * Get the time until the next 3am rollover
 *
 * @param config - Configuration options
 * @returns Duration in milliseconds until the next rollover
 */
export function getTimeUntilRollover(config: OperationalDateConfig = {}): number {
  const { timezone = DEFAULT_TIMEZONE, dayStartHour = OPERATIONAL_DAY_START_HOUR } = config

  const now = DateTime.now().setZone(timezone)

  // Calculate next 3am
  let nextRollover = now.set({ hour: dayStartHour, minute: 0, second: 0, millisecond: 0 })

  // If we're past 3am today, the next rollover is tomorrow
  if (now.hour >= dayStartHour) {
    nextRollover = nextRollover.plus({ days: 1 })
  }

  return nextRollover.diff(now).milliseconds
}

/**
 * Format an operational date for display
 *
 * @param date - The operational date
 * @param config - Configuration options
 * @returns Formatted string like "Monday, January 15, 2026"
 */
export function formatOperationalDate(
  date: Date,
  config: OperationalDateConfig = {}
): string {
  const { timezone = DEFAULT_TIMEZONE } = config

  const dt = DateTime.fromJSDate(date, { zone: timezone })
  return dt.toFormat('EEEE, MMMM d, yyyy')
}

/**
 * Get the operational date as an ISO date string (YYYY-MM-DD)
 *
 * This is useful for database queries and API responses
 *
 * @param date - The timestamp to get operational date for
 * @param config - Configuration options
 * @returns ISO date string
 */
export function getOperationalDateISO(
  date?: Date,
  config: OperationalDateConfig = {}
): string {
  const { timezone = DEFAULT_TIMEZONE } = config

  const operationalDate = getOperationalDate(date, config)
  const dt = DateTime.fromJSDate(operationalDate, { zone: timezone })

  return dt.toISODate()!
}

/**
 * Parse an ISO date string as an operational date
 *
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @param config - Configuration options
 * @returns Date object at midnight in the configured timezone
 */
export function parseOperationalDate(
  isoDate: string,
  config: OperationalDateConfig = {}
): Date {
  const { timezone = DEFAULT_TIMEZONE } = config

  const dt = DateTime.fromISO(isoDate, { zone: timezone })
  if (!dt.isValid) {
    throw new Error(`Invalid ISO date: ${isoDate}`)
  }

  return dt.startOf('day').toJSDate()
}

/**
 * Check if a given time is within the "dangerous" period (midnight to 3am)
 *
 * This period is when the operational date differs from the calendar date.
 * Useful for warnings and confirmations.
 *
 * @param date - The date to check (defaults to now)
 * @param config - Configuration options
 * @returns True if in the midnight-to-3am window
 */
export function isInRolloverPeriod(
  date?: Date,
  config: OperationalDateConfig = {}
): boolean {
  const { timezone = DEFAULT_TIMEZONE, dayStartHour = OPERATIONAL_DAY_START_HOUR } = config

  const dt = date
    ? DateTime.fromJSDate(date, { zone: timezone })
    : DateTime.now().setZone(timezone)

  return dt.hour < dayStartHour
}

/**
 * Get detailed information about the current operational state
 *
 * @param config - Configuration options
 * @returns Object with operational date info and status
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
