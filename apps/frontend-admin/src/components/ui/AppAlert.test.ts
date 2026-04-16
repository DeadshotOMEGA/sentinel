import { describe, expect, it } from 'vitest'
import { resolveAppAlertVariant } from './AppAlert.logic'

describe('resolveAppAlertVariant', () => {
  it('defaults to single-line when only inline content is expected', () => {
    expect(
      resolveAppAlertVariant({
        variant: 'auto',
        heading: undefined,
        description: undefined,
        meta: undefined,
        actions: undefined,
      })
    ).toBe('single-line')
  })

  it('switches to multi-line when heading or description is present', () => {
    expect(
      resolveAppAlertVariant({
        variant: 'auto',
        heading: 'New message!',
        description: undefined,
        meta: undefined,
        actions: undefined,
      })
    ).toBe('multi-line')

    expect(
      resolveAppAlertVariant({
        variant: 'auto',
        heading: undefined,
        description: 'You have 1 unread message',
        meta: undefined,
        actions: undefined,
      })
    ).toBe('multi-line')
  })

  it('switches to multi-line when trailing meta or actions are present', () => {
    expect(
      resolveAppAlertVariant({
        variant: 'auto',
        heading: undefined,
        description: undefined,
        meta: 'Last updated: now',
        actions: undefined,
      })
    ).toBe('multi-line')

    expect(
      resolveAppAlertVariant({
        variant: 'auto',
        heading: undefined,
        description: undefined,
        meta: undefined,
        actions: 'Acknowledge',
      })
    ).toBe('multi-line')
  })

  it('honors explicit variant overrides', () => {
    expect(
      resolveAppAlertVariant({
        variant: 'single-line',
        heading: 'Ignored',
        description: 'Ignored',
        meta: 'Ignored',
        actions: 'Ignored',
      })
    ).toBe('single-line')

    expect(
      resolveAppAlertVariant({
        variant: 'multi-line',
        heading: undefined,
        description: undefined,
        meta: undefined,
        actions: undefined,
      })
    ).toBe('multi-line')
  })
})
