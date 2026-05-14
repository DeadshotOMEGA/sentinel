import { addDays, format, isValid, parseISO } from 'date-fns'
import { formatDateISO } from './date-utils'

export interface UnitEventDateRange {
  eventDate: string
  endDate?: string | null
}

export function getUnitEventEndDate(event: UnitEventDateRange): string {
  return event.endDate || event.eventDate
}

export function isMultiDayUnitEvent(event: UnitEventDateRange): boolean {
  return getUnitEventEndDate(event) !== event.eventDate
}

export function formatUnitEventDate(value: string, pattern = 'MMM dd, yyyy'): string {
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, pattern) : value
}

export function formatUnitEventDateRange(
  event: UnitEventDateRange,
  pattern = 'MMM dd, yyyy'
): string {
  const endDate = getUnitEventEndDate(event)
  const startLabel = formatUnitEventDate(event.eventDate, pattern)

  if (endDate === event.eventDate) {
    return startLabel
  }

  return `${startLabel} - ${formatUnitEventDate(endDate, pattern)}`
}

export function expandUnitEventDateKeys(event: UnitEventDateRange): string[] {
  const start = parseISO(event.eventDate)
  const end = parseISO(getUnitEventEndDate(event))

  if (!isValid(start) || !isValid(end) || end < start) {
    return [event.eventDate]
  }

  const dates: string[] = []
  for (let current = start; current <= end; current = addDays(current, 1)) {
    dates.push(formatDateISO(current))
  }
  return dates
}
