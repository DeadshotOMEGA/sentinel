import { OperationalTimingsSettingsSchema } from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { getDefaultOperationalTimingsSettings } from '../lib/operational-timings-runtime.js'

describe('OperationalTimingsSettingsSchema', () => {
  it('accepts overnight timing combinations', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.lockupWarningTime = '23:30'
    settings.operational.lockupCriticalTime = '00:15'
    settings.operational.dayRolloverTime = '00:45'

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(true)
  })

  it('rejects summer ranges that wrap over year-end', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.workingHours.summerStartDate = '10-01'
    settings.workingHours.summerEndDate = '03-01'

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues[0]?.message).toContain('Summer end date')
    }
  })

  it('accepts weekly and monthly duty watch recurrence rules', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dutyWatchRules = [
      {
        id: 'weekly-biweekly',
        name: 'Biweekly Tuesday',
        effectiveStartDate: '2026-03-03',
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekday: 2, intervalWeeks: 2 },
      },
      {
        id: 'monthly-first-tuesday',
        name: 'First Tuesday Parade',
        effectiveStartDate: '2026-03-03',
        startTime: '18:00',
        endTime: '20:00',
        recurrence: { type: 'monthly_nth_weekday', weekday: 2, ordinal: 'first' },
      },
    ]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(true)
  })

  it('rejects empty duty watch rule lists', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dutyWatchRules = []

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
  })

  it('rejects duplicate duty watch rule ids', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dutyWatchRules = [
      {
        id: 'duplicate',
        name: 'Tuesday',
        effectiveStartDate: '2026-03-03',
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekday: 2, intervalWeeks: 1 },
      },
      {
        id: 'duplicate',
        name: 'Thursday',
        effectiveStartDate: '2026-03-05',
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekday: 4, intervalWeeks: 1 },
      },
    ]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues[0]?.message).toContain('unique')
    }
  })
})
