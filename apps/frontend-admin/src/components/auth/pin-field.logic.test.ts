import { describe, expect, it } from 'vitest'
import { getMaskedPinDisplay, sanitizePinValue } from './pin-field.logic'

describe('pin-field logic', () => {
  it('strips non-digits and caps PIN values at four characters', () => {
    expect(sanitizePinValue('12a34b56')).toBe('1234')
  })

  it('renders standard bullet masking without exposing digits', () => {
    expect(getMaskedPinDisplay('12')).toBe('••')
  })

  it('renders slot placeholders for login-style PIN entry', () => {
    expect(getMaskedPinDisplay('12', 'slots')).toBe('• • - -')
  })

  it('ignores invalid characters when building the masked display', () => {
    expect(getMaskedPinDisplay('1a2b3c4d5', 'slots')).toBe('• • • •')
  })
})
