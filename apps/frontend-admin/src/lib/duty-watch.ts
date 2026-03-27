import {
  getNextDutyWatchOccurrence,
  listDutyWatchOccurrencesInRange,
  type DutyWatchOccurrence,
  type DutyWatchRule,
} from '@sentinel/contracts'
import { addDays, format } from 'date-fns'
import { getIsoWeekdayLongLabel } from './iso-weekday'
import { formatDateISO, parseDateString } from './date-utils'

export function formatDutyWatchRuleSummary(rule: DutyWatchRule): string {
  if (rule.recurrence.type === 'weekly') {
    const intervalLabel =
      rule.recurrence.intervalWeeks === 1
        ? 'Every week'
        : `Every ${rule.recurrence.intervalWeeks} weeks`

    return `${intervalLabel} on ${getIsoWeekdayLongLabel(rule.recurrence.weekday)}`
  }

  const ordinalLabel = {
    first: 'First',
    second: 'Second',
    third: 'Third',
    fourth: 'Fourth',
    last: 'Last',
  }[rule.recurrence.ordinal]

  return `${ordinalLabel} ${getIsoWeekdayLongLabel(rule.recurrence.weekday)} of each month`
}

export function formatDutyWatchOccurrenceLabel(occurrence: DutyWatchOccurrence): string {
  const dateLabel = format(parseDateString(occurrence.date), 'EEE, MMM d')
  return `${dateLabel} ${occurrence.startTime}-${occurrence.endTime}`
}

export function getWeekDutyWatchOccurrences(
  rules: DutyWatchRule[],
  weekStartDate: string
): DutyWatchOccurrence[] {
  const weekEndDate = formatDateISO(addDays(parseDateString(weekStartDate), 6))
  return listDutyWatchOccurrencesInRange(rules, weekStartDate, weekEndDate)
}

export function getNextOccurrenceForRule(
  rule: DutyWatchRule,
  fromDate: string
): DutyWatchOccurrence | null {
  return getNextDutyWatchOccurrence([rule], fromDate)
}
