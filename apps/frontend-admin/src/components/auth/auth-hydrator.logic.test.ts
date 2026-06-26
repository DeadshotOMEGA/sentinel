import { describe, expect, it } from 'vitest'
import {
  shouldIgnoreStaleUnauthorizedSessionCheck,
  shouldRunSessionHeartbeat,
} from './auth-hydrator.logic'

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
        sessionIdAtRequestStart: 'session-1',
        sessionIdNow: 'session-1',
      })
    ).toBe(false)
  })

  it('ignores stale unauthorized responses when a different session became current', () => {
    expect(
      shouldIgnoreStaleUnauthorizedSessionCheck({
        wasAuthenticatedAtRequestStart: true,
        isAuthenticatedNow: true,
        sessionIdAtRequestStart: 'session-1',
        sessionIdNow: 'session-2',
      })
    ).toBe(true)
  })

  it('ignores a daily-reset-ended session check after a fresh login becomes current', () => {
    expect(
      shouldIgnoreStaleUnauthorizedSessionCheck({
        wasAuthenticatedAtRequestStart: true,
        isAuthenticatedNow: true,
        sessionIdAtRequestStart: 'session-ended-by-daily-reset',
        sessionIdNow: 'session-created-by-first-login',
      })
    ).toBe(true)
  })

  it('does not start session heartbeats while a fresh login is still on the login page', () => {
    expect(
      shouldRunSessionHeartbeat({
        isAuthenticated: true,
        pathname: '/login',
      })
    ).toBe(false)
  })

  it('starts session heartbeats for authenticated protected routes', () => {
    expect(
      shouldRunSessionHeartbeat({
        isAuthenticated: true,
        pathname: '/dashboard',
      })
    ).toBe(true)
  })

  it('does not start session heartbeats before authentication', () => {
    expect(
      shouldRunSessionHeartbeat({
        isAuthenticated: false,
        pathname: '/dashboard',
      })
    ).toBe(false)
  })
})
