import {
  getOperationalNightOccurrencesForDate,
  listOperationalNightOccurrencesInRange,
  type OperationalNightCancellation,
  type OperationalNightRule,
} from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'

const REQUIRED_EVERYONE = [{ targetType: 'everyone', targetId: null }] as const

const WEEKLY_TUESDAY_THURSDAY: OperationalNightRule = {
  id: 'weekly-training',
  name: 'Training Night',
  nightType: 'training',
  enabled: true,
  effectiveStartDate: '2026-03-03',
  effectiveEndDate: null,
  startTime: '19:00',
  endTime: '22:00',
  recurrence: { type: 'weekly', weekdays: [2, 4], intervalWeeks: 1 },
  requiredAudience: [...REQUIRED_EVERYONE],
  optionalAudience: [],
}

const BIWEEKLY_TUESDAY: OperationalNightRule = {
  ...WEEKLY_TUESDAY_THURSDAY,
  id: 'biweekly-training',
  recurrence: { type: 'weekly', weekdays: [2], intervalWeeks: 2 },
}

const FIRST_TUESDAY: OperationalNightRule = {
  ...WEEKLY_TUESDAY_THURSDAY,
  id: 'first-tuesday-training',
  recurrence: { type: 'monthly_nth_weekday', weekdays: [2], ordinal: 'first' },
}

const LAST_THURSDAY: OperationalNightRule = {
  ...WEEKLY_TUESDAY_THURSDAY,
  id: 'last-thursday-admin',
  name: 'Admin Night',
  nightType: 'administrative',
  effectiveStartDate: '2026-03-26',
  recurrence: { type: 'monthly_nth_weekday', weekdays: [4], ordinal: 'last' },
}

describe('Operational Night recurrence helpers', () => {
  it('generates multi-weekday weekly occurrences', () => {
    const occurrences = listOperationalNightOccurrencesInRange(
      [WEEKLY_TUESDAY_THURSDAY],
      [],
      '2026-03-01',
      '2026-03-10'
    )

    expect(occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-03-03',
      '2026-03-05',
      '2026-03-10',
    ])
  })

  it('anchors every-two-week rules to the effective start week', () => {
    expect(
      getOperationalNightOccurrencesForDate([BIWEEKLY_TUESDAY], [], '2026-03-03')
    ).toHaveLength(1)
    expect(
      getOperationalNightOccurrencesForDate([BIWEEKLY_TUESDAY], [], '2026-03-10')
    ).toHaveLength(0)
    expect(
      getOperationalNightOccurrencesForDate([BIWEEKLY_TUESDAY], [], '2026-03-17')
    ).toHaveLength(1)
  })

  it('matches monthly first and last weekday rules', () => {
    expect(getOperationalNightOccurrencesForDate([FIRST_TUESDAY], [], '2026-04-07')).toHaveLength(1)
    expect(getOperationalNightOccurrencesForDate([FIRST_TUESDAY], [], '2026-04-14')).toHaveLength(0)
    expect(getOperationalNightOccurrencesForDate([LAST_THURSDAY], [], '2026-04-30')).toHaveLength(1)
    expect(getOperationalNightOccurrencesForDate([LAST_THURSDAY], [], '2026-04-23')).toHaveLength(0)
  })

  it('excludes occurrences after the effective end date', () => {
    const rule: OperationalNightRule = {
      ...WEEKLY_TUESDAY_THURSDAY,
      effectiveEndDate: '2026-03-05',
    }

    const occurrences = listOperationalNightOccurrencesInRange(
      [rule],
      [],
      '2026-03-01',
      '2026-03-10'
    )

    expect(occurrences.map((occurrence) => occurrence.date)).toEqual(['2026-03-03', '2026-03-05'])
  })

  it('omits cancelled occurrences unless requested', () => {
    const cancellations: OperationalNightCancellation[] = [
      { ruleId: WEEKLY_TUESDAY_THURSDAY.id, date: '2026-03-05', reason: null },
    ]

    const visible = listOperationalNightOccurrencesInRange(
      [WEEKLY_TUESDAY_THURSDAY],
      cancellations,
      '2026-03-01',
      '2026-03-10'
    )
    const withCancelled = listOperationalNightOccurrencesInRange(
      [WEEKLY_TUESDAY_THURSDAY],
      cancellations,
      '2026-03-01',
      '2026-03-10',
      { includeCancelled: true }
    )

    expect(visible.map((occurrence) => occurrence.date)).toEqual(['2026-03-03', '2026-03-10'])
    expect(withCancelled.find((occurrence) => occurrence.date === '2026-03-05')?.isCancelled).toBe(
      true
    )
  })
})
