import type {
  DutyWatchMonthlyOrdinal,
  DutyWatchRule,
  IsoWeekday,
  LocalDate,
  TimeOfDay,
} from './schemas/operational-timing.schema.js'

export interface DutyWatchOccurrence {
  date: LocalDate
  startTime: TimeOfDay
  endTime: TimeOfDay
  rules: DutyWatchRule[]
}

const ISO_DATE_MAX_LOOKAHEAD_DAYS = 730

function parseLocalDate(date: LocalDate): Date {
  const [yearText, monthText, dayText] = date.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  return new Date(Date.UTC(year, month - 1, day))
}

function toLocalDate(date: Date): LocalDate {
  return date.toISOString().slice(0, 10) as LocalDate
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function compareTimes(left: TimeOfDay, right: TimeOfDay): number {
  return left.localeCompare(right)
}

function getIsoWeekdayFromDate(date: Date): IsoWeekday {
  const day = date.getUTCDay()
  return (day === 0 ? 7 : day) as IsoWeekday
}

function getStartOfIsoWeek(date: Date): Date {
  return addUtcDays(date, 1 - getIsoWeekdayFromDate(date))
}

function getWeeksBetween(anchorWeek: Date, targetWeek: Date): number {
  const diffMs = targetWeek.getTime() - anchorWeek.getTime()
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

function getOrdinalForDate(date: Date): DutyWatchMonthlyOrdinal {
  const dayOfMonth = date.getUTCDate()
  const nextWeek = addUtcDays(date, 7)
  const isLast = nextWeek.getUTCMonth() !== date.getUTCMonth()

  if (isLast) {
    return 'last'
  }

  if (dayOfMonth <= 7) {
    return 'first'
  }
  if (dayOfMonth <= 14) {
    return 'second'
  }
  if (dayOfMonth <= 21) {
    return 'third'
  }
  return 'fourth'
}

function mergeOccurrenceRules(date: LocalDate, rules: DutyWatchRule[]): DutyWatchOccurrence {
  const sortedRules = [...rules].sort((left, right) => {
    const startCompare = compareTimes(left.startTime, right.startTime)
    if (startCompare !== 0) {
      return startCompare
    }
    return compareTimes(left.endTime, right.endTime)
  })

  const startTime = sortedRules.reduce(
    (earliest, rule) => (compareTimes(rule.startTime, earliest) < 0 ? rule.startTime : earliest),
    sortedRules[0]!.startTime
  )
  const endTime = sortedRules.reduce(
    (latest, rule) => (compareTimes(rule.endTime, latest) > 0 ? rule.endTime : latest),
    sortedRules[0]!.endTime
  )

  return {
    date,
    startTime,
    endTime,
    rules: sortedRules,
  }
}

export function compareLocalDates(left: LocalDate, right: LocalDate): number {
  return left.localeCompare(right)
}

export function addDaysToLocalDate(date: LocalDate, days: number): LocalDate {
  return toLocalDate(addUtcDays(parseLocalDate(date), days))
}

export function getIsoWeekdayForLocalDate(date: LocalDate): IsoWeekday {
  return getIsoWeekdayFromDate(parseLocalDate(date))
}

export function doesDutyWatchRuleMatchDate(rule: DutyWatchRule, date: LocalDate): boolean {
  if (compareLocalDates(date, rule.effectiveStartDate) < 0) {
    return false
  }

  const targetDate = parseLocalDate(date)
  const targetWeekday = getIsoWeekdayFromDate(targetDate)
  if (targetWeekday !== rule.recurrence.weekday) {
    return false
  }

  if (rule.recurrence.type === 'weekly') {
    const anchorWeek = getStartOfIsoWeek(parseLocalDate(rule.effectiveStartDate))
    const targetWeek = getStartOfIsoWeek(targetDate)
    const weeksSinceStart = getWeeksBetween(anchorWeek, targetWeek)
    return weeksSinceStart >= 0 && weeksSinceStart % rule.recurrence.intervalWeeks === 0
  }

  return getOrdinalForDate(targetDate) === rule.recurrence.ordinal
}

export function getDutyWatchOccurrenceForDate(
  rules: DutyWatchRule[],
  date: LocalDate
): DutyWatchOccurrence | null {
  const matchingRules = rules.filter((rule) => doesDutyWatchRuleMatchDate(rule, date))
  if (matchingRules.length === 0) {
    return null
  }

  return mergeOccurrenceRules(date, matchingRules)
}

export function listDutyWatchOccurrencesInRange(
  rules: DutyWatchRule[],
  startDate: LocalDate,
  endDate: LocalDate
): DutyWatchOccurrence[] {
  if (compareLocalDates(startDate, endDate) > 0) {
    return []
  }

  const occurrences: DutyWatchOccurrence[] = []
  let currentDate = startDate

  while (compareLocalDates(currentDate, endDate) <= 0) {
    const occurrence = getDutyWatchOccurrenceForDate(rules, currentDate)
    if (occurrence) {
      occurrences.push(occurrence)
    }

    currentDate = addDaysToLocalDate(currentDate, 1)
  }

  return occurrences
}

export function getNextDutyWatchOccurrence(
  rules: DutyWatchRule[],
  fromDate: LocalDate,
  options?: { inclusive?: boolean; maxDays?: number }
): DutyWatchOccurrence | null {
  const inclusive = options?.inclusive ?? true
  const maxDays = options?.maxDays ?? ISO_DATE_MAX_LOOKAHEAD_DAYS
  let currentDate = inclusive ? fromDate : addDaysToLocalDate(fromDate, 1)

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const occurrence = getDutyWatchOccurrenceForDate(rules, currentDate)
    if (occurrence) {
      return occurrence
    }

    currentDate = addDaysToLocalDate(currentDate, 1)
  }

  return null
}

export function isDutyWatchActiveOnDate(rules: DutyWatchRule[], date: LocalDate): boolean {
  return getDutyWatchOccurrenceForDate(rules, date) !== null
}
