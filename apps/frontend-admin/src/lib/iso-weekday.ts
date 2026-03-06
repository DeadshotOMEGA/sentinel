import type { IsoWeekday } from '@sentinel/contracts'

export const ISO_WEEKDAY_OPTIONS: Array<{
  value: IsoWeekday
  shortLabel: string
  longLabel: string
}> = [
  { value: 1, shortLabel: 'Mon', longLabel: 'Monday' },
  { value: 2, shortLabel: 'Tue', longLabel: 'Tuesday' },
  { value: 3, shortLabel: 'Wed', longLabel: 'Wednesday' },
  { value: 4, shortLabel: 'Thu', longLabel: 'Thursday' },
  { value: 5, shortLabel: 'Fri', longLabel: 'Friday' },
  { value: 6, shortLabel: 'Sat', longLabel: 'Saturday' },
  { value: 7, shortLabel: 'Sun', longLabel: 'Sunday' },
]

export function isIsoWeekday(value: number): value is IsoWeekday {
  return Number.isInteger(value) && value >= 1 && value <= 7
}

export function sortIsoWeekdays(values: number[]): IsoWeekday[] {
  const uniqueSorted = [...new Set(values)]
    .filter((value) => isIsoWeekday(value))
    .sort((left, right) => left - right)

  return uniqueSorted as IsoWeekday[]
}

export function getIsoWeekdayShortLabel(value: IsoWeekday): string {
  return ISO_WEEKDAY_OPTIONS.find((option) => option.value === value)?.shortLabel ?? String(value)
}

export function getIsoWeekdayLongLabel(value: IsoWeekday): string {
  return ISO_WEEKDAY_OPTIONS.find((option) => option.value === value)?.longLabel ?? String(value)
}

export function formatIsoWeekdayList(
  values: IsoWeekday[],
  format: 'short' | 'long' = 'short'
): string {
  const formatter = format === 'long' ? getIsoWeekdayLongLabel : getIsoWeekdayShortLabel
  return sortIsoWeekdays(values)
    .map((value) => formatter(value))
    .join(', ')
}
