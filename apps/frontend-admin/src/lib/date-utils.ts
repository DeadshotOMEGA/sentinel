import { startOfWeek, format, parseISO } from 'date-fns'

/** Get Monday of the week containing the given date */
export function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/** Format a Date as 'yyyy-MM-dd' */
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Safely parse a 'yyyy-MM-dd' string into a Date (no timezone shift) */
export function parseDateString(str: string): Date {
  return parseISO(str)
}

/** Get the first day of the quarter containing the given date */
export function getQuarterStart(date: Date): Date {
  const month = date.getMonth()
  const quarterMonth = month - (month % 3)
  return new Date(date.getFullYear(), quarterMonth, 1)
}
