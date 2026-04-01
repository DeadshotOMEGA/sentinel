import { describe, expect, it } from 'vitest'
import {
  buildForcedReauthLoginUrl,
  buildLoginUrl,
  inferPostLoginDestinationFromPath,
  resolvePostLoginDestinationHint,
} from './post-login-destination'

describe('post-login destination helpers', () => {
  it('defaults non-kiosk paths to the dashboard destination', () => {
    expect(inferPostLoginDestinationFromPath('/dashboard')).toBe('/dashboard')
    expect(inferPostLoginDestinationFromPath('/settings')).toBe('/dashboard')
    expect(inferPostLoginDestinationFromPath(undefined)).toBe('/dashboard')
  })

  it('treats kiosk paths as kiosk destinations', () => {
    expect(inferPostLoginDestinationFromPath('/kiosk')).toBe('/kiosk')
    expect(inferPostLoginDestinationFromPath('/kiosk/setup')).toBe('/kiosk')
  })

  it('prefers explicit destination hints from the query string', () => {
    expect(resolvePostLoginDestinationHint('/dashboard', '?destination=%2Fkiosk')).toBe('/kiosk')
    expect(resolvePostLoginDestinationHint('/change-pin-required', '?redirect=%2Fkiosk')).toBe(
      '/kiosk'
    )
  })

  it('builds kiosk-aware login URLs only when needed', () => {
    expect(buildLoginUrl('/dashboard')).toBe('/login')
    expect(buildLoginUrl('/kiosk')).toBe('/login?destination=%2Fkiosk')
    expect(buildLoginUrl('/change-pin-required', '?destination=%2Fkiosk')).toBe(
      '/login?destination=%2Fkiosk'
    )
  })

  it('uses a dashboard-default login path for forced reauth', () => {
    expect(buildForcedReauthLoginUrl()).toBe('/login')
  })
})
