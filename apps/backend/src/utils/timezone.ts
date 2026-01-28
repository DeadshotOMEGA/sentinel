/**
 * Timezone Utilities
 *
 * Utilities for working with timezones in the Sentinel application.
 */

import { DateTime } from 'luxon'
import { DEFAULT_TIMEZONE } from './operational-date.js'

/**
 * Get the current time in the configured timezone
 *
 * @param timezone - The timezone to use (defaults to America/Winnipeg)
 * @returns DateTime object in the specified timezone
 */
export function nowInTimezone(timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.now().setZone(timezone)
}

/**
 * Convert a Date object to the configured timezone
 *
 * @param date - The Date to convert
 * @param timezone - The target timezone
 * @returns DateTime object in the specified timezone
 */
export function toTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.fromJSDate(date, { zone: timezone })
}

/**
 * Convert a timestamp to a specific local time for display
 *
 * @param date - The Date to format
 * @param timezone - The timezone for display
 * @returns Formatted time string (e.g., "3:45 PM")
 */
export function formatTime(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toFormat('h:mm a')
}

/**
 * Convert a timestamp to a specific local date/time for display
 *
 * @param date - The Date to format
 * @param timezone - The timezone for display
 * @returns Formatted datetime string (e.g., "Jan 15, 2026 3:45 PM")
 */
export function formatDateTime(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toFormat('MMM d, yyyy h:mm a')
}

/**
 * Convert a timestamp to a specific local date for display
 *
 * @param date - The Date to format
 * @param timezone - The timezone for display
 * @returns Formatted date string (e.g., "Jan 15, 2026")
 */
export function formatDate(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toFormat('MMM d, yyyy')
}

/**
 * Get the current hour in the configured timezone
 *
 * @param timezone - The timezone to use
 * @returns The current hour (0-23)
 */
export function getCurrentHour(timezone: string = DEFAULT_TIMEZONE): number {
  return DateTime.now().setZone(timezone).hour
}

/**
 * Check if the current time is within a time range
 *
 * @param startHour - Start hour (0-23)
 * @param endHour - End hour (0-23)
 * @param timezone - The timezone to use
 * @returns True if current time is within the range
 */
export function isWithinTimeRange(
  startHour: number,
  endHour: number,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const currentHour = getCurrentHour(timezone)

  if (startHour <= endHour) {
    // Normal range (e.g., 9am to 5pm)
    return currentHour >= startHour && currentHour < endHour
  } else {
    // Overnight range (e.g., 10pm to 6am)
    return currentHour >= startHour || currentHour < endHour
  }
}

/**
 * Parse a time string (HH:MM) into hours and minutes
 *
 * @param timeString - Time string in HH:MM format
 * @returns Object with hour and minute
 */
export function parseTimeString(timeString: string): { hour: number; minute: number } {
  const parts = timeString.split(':')
  const hourStr = parts[0] ?? ''
  const minuteStr = parts[1] ?? '0'
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time string: ${timeString}`)
  }

  return { hour, minute }
}

/**
 * Create a DateTime for a specific time today in the given timezone
 *
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - The timezone to use
 * @returns DateTime object
 */
export function timeToday(
  hour: number,
  minute: number = 0,
  timezone: string = DEFAULT_TIMEZONE
): DateTime {
  const now = DateTime.now().setZone(timezone)
  return now.set({ hour, minute, second: 0, millisecond: 0 })
}

/**
 * Get the day of week name for a number (1-7)
 *
 * @param dayNumber - Day number (1=Monday, 7=Sunday)
 * @returns Day name
 */
export function getDayName(dayNumber: number): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days[dayNumber] || ''
}

/**
 * Get the short day name for a number (1-7)
 *
 * @param dayNumber - Day number (1=Monday, 7=Sunday)
 * @returns Short day name (e.g., "Mon")
 */
export function getShortDayName(dayNumber: number): string {
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days[dayNumber] || ''
}

/**
 * Calculate the duration between two dates in human-readable format
 *
 * @param start - Start date
 * @param end - End date (defaults to now)
 * @returns Human-readable duration string
 */
export function humanDuration(start: Date, end?: Date): string {
  const startDt = DateTime.fromJSDate(start)
  const endDt = end ? DateTime.fromJSDate(end) : DateTime.now()

  const diff = endDt.diff(startDt, ['hours', 'minutes'])

  if (diff.hours >= 1) {
    const hours = Math.floor(diff.hours)
    const mins = Math.floor(diff.minutes % 60)
    if (mins > 0) {
      return `${hours}h ${mins}m`
    }
    return `${hours}h`
  }

  return `${Math.floor(diff.minutes)}m`
}
