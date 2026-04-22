import { describe, expect, it } from 'vitest'
import {
  hasKioskDeviceCookie,
  isKioskDeviceBootstrapRoute,
  isKioskRoute,
  resolveKioskBootstrapNext,
} from './kiosk-device-auth'

describe('kiosk device auth helpers', () => {
  it('detects kiosk routes and bootstrap route consistently', () => {
    expect(isKioskRoute('/kiosk')).toBe(true)
    expect(isKioskRoute('/kiosk/front-entrance')).toBe(true)
    expect(isKioskRoute('/dashboard')).toBe(false)

    expect(isKioskDeviceBootstrapRoute('/kiosk/device-auth')).toBe(true)
    expect(isKioskDeviceBootstrapRoute('/kiosk')).toBe(false)
  })

  it('treats only non-empty cookie values as device auth cookies', () => {
    expect(hasKioskDeviceCookie('sk_kiosk_cookie')).toBe(true)
    expect(hasKioskDeviceCookie('   ')).toBe(false)
    expect(hasKioskDeviceCookie(null)).toBe(false)
  })

  it('sanitizes kiosk bootstrap redirects to kiosk-only internal paths', () => {
    expect(resolveKioskBootstrapNext('/kiosk')).toBe('/kiosk')
    expect(resolveKioskBootstrapNext('/kiosk?mode=front')).toBe('/kiosk?mode=front')
    expect(resolveKioskBootstrapNext('/kiosk/front-entrance')).toBe('/kiosk/front-entrance')

    expect(resolveKioskBootstrapNext('/dashboard')).toBe('/kiosk')
    expect(resolveKioskBootstrapNext('https://example.com/kiosk')).toBe('/kiosk')
    expect(resolveKioskBootstrapNext('//example.com/kiosk')).toBe('/kiosk')
    expect(resolveKioskBootstrapNext(undefined)).toBe('/kiosk')
  })
})
