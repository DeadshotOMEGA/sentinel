import {
  getDutyWatchOccurrenceForDate,
  getNextDutyWatchOccurrence,
  listDutyWatchOccurrencesInRange,
  type DutyWatchRule,
} from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'

const BIWEEKLY_TUESDAY: DutyWatchRule = {
  id: 'biweekly-tuesday',
  name: 'Biweekly Tuesday Watch',
  effectiveStartDate: '2026-03-03',
  startTime: '19:00',
  endTime: '22:00',
  recurrence: { type: 'weekly', weekday: 2, intervalWeeks: 2 },
}

const FIRST_TUESDAY: DutyWatchRule = {
  id: 'first-tuesday',
  name: 'First Tuesday Meeting',
  effectiveStartDate: '2026-03-03',
  startTime: '18:00',
  endTime: '20:00',
  recurrence: { type: 'monthly_nth_weekday', weekday: 2, ordinal: 'first' },
}

const LAST_THURSDAY: DutyWatchRule = {
  id: 'last-thursday',
  name: 'Last Thursday Muster',
  effectiveStartDate: '2026-03-26',
  startTime: '17:30',
  endTime: '19:00',
  recurrence: { type: 'monthly_nth_weekday', weekday: 4, ordinal: 'last' },
}

describe('Duty Watch recurrence helpers', () => {
  it('matches anchored weekly rules across month boundaries', () => {
    expect(getDutyWatchOccurrenceForDate([BIWEEKLY_TUESDAY], '2026-03-03')).not.toBeNull()
    expect(getDutyWatchOccurrenceForDate([BIWEEKLY_TUESDAY], '2026-03-10')).toBeNull()
    expect(getDutyWatchOccurrenceForDate([BIWEEKLY_TUESDAY], '2026-03-17')).not.toBeNull()
    expect(getDutyWatchOccurrenceForDate([BIWEEKLY_TUESDAY], '2026-03-31')).not.toBeNull()
  })

  it('matches monthly first Tuesday and last Thursday rules', () => {
    expect(getDutyWatchOccurrenceForDate([FIRST_TUESDAY], '2026-04-07')).not.toBeNull()
    expect(getDutyWatchOccurrenceForDate([FIRST_TUESDAY], '2026-04-14')).toBeNull()
    expect(getDutyWatchOccurrenceForDate([LAST_THURSDAY], '2026-04-30')).not.toBeNull()
    expect(getDutyWatchOccurrenceForDate([LAST_THURSDAY], '2026-04-23')).toBeNull()
  })

  it('merges overlapping rules into one occurrence date', () => {
    const occurrences = listDutyWatchOccurrencesInRange(
      [BIWEEKLY_TUESDAY, FIRST_TUESDAY],
      '2026-03-01',
      '2026-03-31'
    )

    const marchThird = occurrences.find((occurrence) => occurrence.date === '2026-03-03')
    expect(marchThird?.rules.map((rule) => rule.id)).toEqual(['first-tuesday', 'biweekly-tuesday'])
    expect(marchThird?.startTime).toBe('18:00')
    expect(marchThird?.endTime).toBe('22:00')
  })

  it('finds the next upcoming occurrence', () => {
    const nextOccurrence = getNextDutyWatchOccurrence(
      [BIWEEKLY_TUESDAY, LAST_THURSDAY],
      '2026-03-20',
      { inclusive: true }
    )

    expect(nextOccurrence?.date).toBe('2026-03-26')
  })
})
