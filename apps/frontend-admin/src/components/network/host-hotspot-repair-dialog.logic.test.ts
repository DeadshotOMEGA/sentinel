import { describe, expect, it } from 'vitest'
import {
  getHostHotspotAntennaWaitLabel,
  getHostHotspotRepairStepState,
  getHostHotspotResetWatchLabel,
  isHostHotspotAntennaWaitActionDisabled,
  isHostHotspotResetWatchActionDisabled,
} from './host-hotspot-repair-dialog.logic'

describe('host hotspot repair dialog logic', () => {
  it('marks earlier steps complete and later steps pending', () => {
    expect(getHostHotspotRepairStepState('run-repair', 'check-wifi')).toBe('complete')
    expect(getHostHotspotRepairStepState('watch-reset', 'run-repair')).toBe('complete')
    expect(getHostHotspotRepairStepState('watch-reset', 'watch-reset')).toBe('active')
    expect(getHostHotspotRepairStepState('reset-antenna', 'run-repair')).toBe('complete')
    expect(getHostHotspotRepairStepState('reset-antenna', 'watch-reset')).toBe('complete')
    expect(getHostHotspotRepairStepState('reset-antenna', 'reset-antenna')).toBe('active')
    expect(getHostHotspotRepairStepState('reset-antenna', 'retry-repair')).toBe('pending')
  })

  it('marks all steps complete after the final repair is queued', () => {
    expect(getHostHotspotRepairStepState('complete', 'check-wifi')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'run-repair')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'watch-reset')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'reset-antenna')).toBe('complete')
    expect(getHostHotspotRepairStepState('complete', 'retry-repair')).toBe('complete')
  })

  it('labels and disables the reset watch action while the adapter settles', () => {
    expect(getHostHotspotResetWatchLabel({ secondsRemaining: 10 })).toBe('Watching reset 10s')
    expect(isHostHotspotResetWatchActionDisabled({ secondsRemaining: 10 })).toBe(true)

    expect(getHostHotspotResetWatchLabel({ secondsRemaining: 0 })).toBe('Continue if needed')
    expect(isHostHotspotResetWatchActionDisabled({ secondsRemaining: 0 })).toBe(false)
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
