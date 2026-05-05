import { describe, expect, it } from 'vitest'
import { shouldIgnoreStaleUnauthorizedSessionCheck } from './auth-hydrator.logic'

describe('auth hydrator logic', () => {
  it('ignores stale unauthorized responses when login completed during the request', () => {
    expect(
      shouldIgnoreStaleUnauthorizedSessionCheck({
        wasAuthenticatedAtRequestStart: false,
        isAuthenticatedNow: true,
      })
    ).toBe(true)
  })

  it('does not ignore unauthorized responses for still-logged-out sessions', () => {
    expect(
      shouldIgnoreStaleUnauthorizedSessionCheck({
        wasAuthenticatedAtRequestStart: false,
        isAuthenticatedNow: false,
      })
    ).toBe(false)
  })

  it('does not ignore unauthorized responses for sessions that started authenticated', () => {
    expect(
      shouldIgnoreStaleUnauthorizedSessionCheck({
        wasAuthenticatedAtRequestStart: true,
        isAuthenticatedNow: true,
      })
    ).toBe(false)
  })
})
