import { describe, expect, it } from 'vitest'
import {
  getHostHotspotAntennaWaitLabel,
  getHostHotspotRepairStepState,
  isHostHotspotAntennaWaitActionDisabled,
} from './host-hotspot-repair-dialog.logic'

describe('host hotspot repair dialog logic', () => {
  it('marks earlier steps complete and later steps pending', () => {
    expect(getHostHotspotRepairStepState('run-repair', 'check-wifi')).toBe('complete')
    expect(getHostHotspotRepairStepState('reset-antenna', 'run-repair')).toBe('complete')
    expect(getHostHotspotRepairStepState('reset-antenna', 'reset-antenna')).toBe('active')
    expect(getHostHotspotRepairStepState('reset-antenna', 'retry-repair')).toBe('pending')
  })

  it('marks all steps complete after the final repair is queued', () => {
    expect(getHostHotspotRepairStepState('complete', 'check-wifi')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'run-repair')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'reset-antenna')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'retry-repair')).toBe('complete')
  })

  it('labels and disables the antenna wait action while the timer runs', () => {
    expect(getHostHotspotAntennaWaitLabel({ started: false, secondsRemaining: 3 })).toBe(
      'Start 3-second wait'
    )
    expect(isHostHotspotAntennaWaitActionDisabled({ started: false, secondsRemaining: 3 })).toBe(
      false
    )

    expect(getHostHotspotAntennaWaitLabel({ started: true, secondsRemaining: 2 })).toBe('Wait 2s')
    expect(isHostHotspotAntennaWaitActionDisabled({ started: true, secondsRemaining: 2 })).toBe(
      true
    )

    expect(getHostHotspotAntennaWaitLabel({ started: true, secondsRemaining: 0 })).toBe(
      'Antenna is plugged in'
    )
    expect(isHostHotspotAntennaWaitActionDisabled({ started: true, secondsRemaining: 0 })).toBe(
      false
    )
  })
})
