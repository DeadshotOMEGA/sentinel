import { describe, expect, it } from 'vitest'
import {
  deriveLoginStepFromPreflight,
  getSetupDescription,
  isPinSetupRequiredError,
} from './login-flow'

describe('login flow helpers', () => {
  it('routes configured members to the PIN step', () => {
    expect(
      deriveLoginStepFromPreflight({
        member: {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Example',
          rank: 'PO2',
          serviceNumber: 'M12345678',
          accountLevel: 1,
          mustChangePin: false,
        },
        pinState: 'configured',
        setupReason: null,
      })
    ).toEqual({
      step: 'pin',
      setupState: null,
    })
  })

  it('routes setup-required members to the setup step and preserves reason', () => {
    expect(
      deriveLoginStepFromPreflight({
        member: {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Example',
          rank: 'PO2',
          serviceNumber: 'M12345678',
          accountLevel: 1,
          mustChangePin: true,
        },
        pinState: 'setup_required',
        setupReason: 'default',
      })
    ).toEqual({
      step: 'setup',
      setupState: {
        member: {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Example',
          rank: 'PO2',
          serviceNumber: 'M12345678',
          accountLevel: 1,
          mustChangePin: true,
        },
        reason: 'default',
      },
    })
  })

  it('detects PIN setup required auth errors', () => {
    expect(isPinSetupRequiredError({ error: 'PIN_SETUP_REQUIRED' })).toBe(true)
    expect(isPinSetupRequiredError({ error: 'UNAUTHORIZED' })).toBe(false)
    expect(isPinSetupRequiredError(null)).toBe(false)
  })

  it('uses reason-specific setup guidance', () => {
    expect(getSetupDescription('default')).toContain('temporary default PIN')
    expect(getSetupDescription('missing')).toContain('does not have a PIN configured')
  })
})
