import type {
  DutyWatchMonthlyOrdinal,
  IsoWeekday,
  LocalDate,
  OperationalNightAudienceTarget,
  OperationalNightCancellation,
  OperationalNightRule,
  OperationalNightType,
  TimeOfDay,
} from './schemas/operational-timing.schema.js'

export interface OperationalNightOccurrence {
  date: LocalDate
  nightType: OperationalNightType
  startTime: TimeOfDay
  endTime: TimeOfDay
  ruleId: string
  ruleName: string
  rule: OperationalNightRule
  requiredAudience: OperationalNightAudienceTarget[]
  optionalAudience: OperationalNightAudienceTarget[]
  isCancelled: boolean
  cancellationReason: string | null
}

export interface OperationalNightOccurrenceOptions {
  includeCancelled?: boolean
  nightTypes?: OperationalNightType[]
}

const ISO_DATE_MAX_LOOKAHEAD_DAYS = 730

function parseLocalDate(date: LocalDate): Date {
  const [yearText, monthText, dayText] = date.split('-')
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)))
}

function toLocalDate(date: Date): LocalDate {
  return date.toISOString().slice(0, 10) as LocalDate
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
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

function getCancellation(
  cancellations: OperationalNightCancellation[],
  ruleId: string,
  date: LocalDate
): OperationalNightCancellation | null {
  return cancellations.find((item) => item.ruleId === ruleId && item.date === date) ?? null
}

export function compareOperationalNightLocalDates(left: LocalDate, right: LocalDate): number {
  return left.localeCompare(right)
}

export function addDaysToOperationalNightLocalDate(date: LocalDate, days: number): LocalDate {
  return toLocalDate(addUtcDays(parseLocalDate(date), days))
}

export function doesOperationalNightRuleMatchDate(
  rule: OperationalNightRule,
  date: LocalDate
): boolean {
  if (!rule.enabled) {
    return false
  }

  if (compareOperationalNightLocalDates(date, rule.effectiveStartDate) < 0) {
    return false
  }

  if (rule.effectiveEndDate && compareOperationalNightLocalDates(date, rule.effectiveEndDate) > 0) {
    return false
  }

  const targetDate = parseLocalDate(date)
  const targetWeekday = getIsoWeekdayFromDate(targetDate)
  if (!rule.recurrence.weekdays.includes(targetWeekday)) {
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

export function getOperationalNightOccurrencesForDate(
  rules: OperationalNightRule[],
  cancellations: OperationalNightCancellation[],
  date: LocalDate,
  options: OperationalNightOccurrenceOptions = {}
): OperationalNightOccurrence[] {
  const includeCancelled = options.includeCancelled ?? false
  const nightTypes = options.nightTypes ? new Set(options.nightTypes) : null

  return rules
    .filter((rule) => !nightTypes || nightTypes.has(rule.nightType))
    .filter((rule) => doesOperationalNightRuleMatchDate(rule, date))
    .map((rule) => {
      const cancellation = getCancellation(cancellations, rule.id, date)
      return {
        date,
        nightType: rule.nightType,
        startTime: rule.startTime,
        endTime: rule.endTime,
        ruleId: rule.id,
        ruleName: rule.name,
        rule,
        requiredAudience: rule.requiredAudience.map((target) => ({ ...target })),
        optionalAudience: rule.optionalAudience.map((target) => ({ ...target })),
        isCancelled: cancellation !== null,
        cancellationReason: cancellation?.reason ?? null,
      }
    })
    .filter((occurrence) => includeCancelled || !occurrence.isCancelled)
    .sort((left, right) =>
      `${left.startTime}:${left.ruleName}`.localeCompare(`${right.startTime}:${right.ruleName}`)
    )
}

export function listOperationalNightOccurrencesInRange(
  rules: OperationalNightRule[],
  cancellations: OperationalNightCancellation[],
  startDate: LocalDate,
  endDate: LocalDate,
  options: OperationalNightOccurrenceOptions = {}
): OperationalNightOccurrence[] {
  if (compareOperationalNightLocalDates(startDate, endDate) > 0) {
    return []
  }

  const occurrences: OperationalNightOccurrence[] = []
  let currentDate = startDate

  while (compareOperationalNightLocalDates(currentDate, endDate) <= 0) {
    occurrences.push(
      ...getOperationalNightOccurrencesForDate(rules, cancellations, currentDate, options)
    )
    currentDate = addDaysToOperationalNightLocalDate(currentDate, 1)
  }

  return occurrences
}

export function getNextOperationalNightOccurrence(
  rules: OperationalNightRule[],
  cancellations: OperationalNightCancellation[],
  fromDate: LocalDate,
  options: OperationalNightOccurrenceOptions & { inclusive?: boolean; maxDays?: number } = {}
): OperationalNightOccurrence | null {
  const inclusive = options.inclusive ?? true
  const maxDays = options.maxDays ?? ISO_DATE_MAX_LOOKAHEAD_DAYS
  let currentDate = inclusive ? fromDate : addDaysToOperationalNightLocalDate(fromDate, 1)

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const occurrences = getOperationalNightOccurrencesForDate(
      rules,
      cancellations,
      currentDate,
      options
    )
    if (occurrences.length > 0) {
      return occurrences[0] ?? null
    }
    currentDate = addDaysToOperationalNightLocalDate(currentDate, 1)
  }

  return null
}
