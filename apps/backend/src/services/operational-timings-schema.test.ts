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

  it('accepts weekly, biweekly, monthly, effective-end, and cancellation night rules', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.nightRules = [
      {
        id: 'training-weekly',
        name: 'Training Night',
        nightType: 'training',
        enabled: true,
        effectiveStartDate: '2026-03-03',
        effectiveEndDate: null,
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekdays: [2, 4], intervalWeeks: 2 },
        requiredAudience: [{ targetType: 'everyone', targetId: null }],
        optionalAudience: [{ targetType: 'tag', targetId: 'tag-fts' }],
      },
      {
        id: 'admin-monthly',
        name: 'Admin Night',
        nightType: 'administrative',
        enabled: false,
        effectiveStartDate: '2026-03-01',
        effectiveEndDate: '2026-08-31',
        startTime: '18:30',
        endTime: '21:00',
        recurrence: { type: 'monthly_nth_weekday', weekdays: [1], ordinal: 'first' },
        requiredAudience: [],
        optionalAudience: [],
      },
    ]
    settings.operational.nightCancellations = [
      { ruleId: 'training-weekly', date: '2026-07-07', reason: 'Summer stand-down' },
    ]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(true)
  })

  it('rejects duplicate Training/Admin Night rule ids', () => {
    const settings = getDefaultOperationalTimingsSettings()
    const rule = {
      id: 'duplicate-night',
      name: 'Training Night',
      nightType: 'training' as const,
      enabled: true,
      effectiveStartDate: '2026-03-03',
      effectiveEndDate: null,
      startTime: '19:00',
      endTime: '22:00',
      recurrence: { type: 'weekly' as const, weekdays: [2], intervalWeeks: 1 },
      requiredAudience: [{ targetType: 'everyone' as const, targetId: null }],
      optionalAudience: [],
    }
    settings.operational.nightRules = [rule, { ...rule, name: 'Admin Night' }]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues[0]?.message).toContain('unique')
    }
  })

  it('rejects enabled Training/Admin Night rules without required audience', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.nightRules = [
      {
        id: 'empty-required',
        name: 'Training Night',
        nightType: 'training',
        enabled: true,
        effectiveStartDate: '2026-03-03',
        effectiveEndDate: null,
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekdays: [2], intervalWeeks: 1 },
        requiredAudience: [],
        optionalAudience: [],
      },
    ]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues[0]?.message).toContain('required audience')
    }
  })

  it('rejects duplicate or conflicting Training/Admin Night audience targets', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.nightRules = [
      {
        id: 'conflicting-audience',
        name: 'Training Night',
        nightType: 'training',
        enabled: true,
        effectiveStartDate: '2026-03-03',
        effectiveEndDate: null,
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekdays: [2], intervalWeeks: 1 },
        requiredAudience: [{ targetType: 'division', targetId: 'division-ops' }],
        optionalAudience: [{ targetType: 'division', targetId: 'division-ops' }],
      },
    ]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues[0]?.message).toContain('required and optional')
    }
  })

  it('rejects invalid Training/Admin Night effective dates', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.nightRules = [
      {
        id: 'invalid-effective-dates',
        name: 'Training Night',
        nightType: 'training',
        enabled: true,
        effectiveStartDate: '2026-09-01',
        effectiveEndDate: '2026-08-31',
        startTime: '19:00',
        endTime: '22:00',
        recurrence: { type: 'weekly', weekdays: [2], intervalWeeks: 1 },
        requiredAudience: [{ targetType: 'everyone', targetId: null }],
        optionalAudience: [],
      },
    ]

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, settings)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.issues[0]?.message).toContain('Effective end date')
    }
  })
})
