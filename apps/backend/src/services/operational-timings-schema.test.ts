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
})
