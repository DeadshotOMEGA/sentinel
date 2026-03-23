import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyOperationalTimingsRuntimeState,
  getDefaultOperationalTimingsSettings,
} from '../lib/operational-timings-runtime.js'
import { getOperationalDateISO, isDutyWatchNight } from './operational-date.js'

describe('operational-date runtime timing behavior', () => {
  beforeEach(() => {
    applyOperationalTimingsRuntimeState({
      settings: getDefaultOperationalTimingsSettings(),
      source: 'default',
      updatedAt: null,
    })
  })

  it('uses minute-precision rollover for operational date', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dayRolloverTime = '03:30'

    applyOperationalTimingsRuntimeState({
      settings,
      source: 'stored',
      updatedAt: null,
    })

    const beforeRollover = getOperationalDateISO(new Date('2026-03-06T03:15:00-06:00'))
    const atRollover = getOperationalDateISO(new Date('2026-03-06T03:30:00-06:00'))

    expect(beforeRollover).toBe('2026-03-05')
    expect(atRollover).toBe('2026-03-06')
  })

  it('uses configured duty-watch days', () => {
    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dutyWatchDays = [1, 3, 5]

    applyOperationalTimingsRuntimeState({
      settings,
      source: 'stored',
      updatedAt: null,
    })

    expect(isDutyWatchNight(new Date('2026-03-02T20:00:00-06:00'))).toBe(true) // Monday
    expect(isDutyWatchNight(new Date('2026-03-04T20:00:00-06:00'))).toBe(true) // Wednesday
    expect(isDutyWatchNight(new Date('2026-03-03T20:00:00-06:00'))).toBe(false) // Tuesday
  })
})
