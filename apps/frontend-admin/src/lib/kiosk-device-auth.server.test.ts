import { describe, expect, it } from 'vitest'
import { resolvePublicRequestUrl } from './kiosk-device-auth.server'

describe('kiosk device auth server helpers', () => {
  it('uses reverse-proxy host and protocol for public redirects', () => {
    const request = new Request('http://localhost:3001/kiosk/device-auth?next=%2Fkiosk', {
      headers: {
        host: 'localhost:3001',
        'x-forwarded-host': 'sentinel.local',
        'x-forwarded-proto': 'http',
      },
    })

    expect(resolvePublicRequestUrl(request).toString()).toBe(
      'http://sentinel.local/kiosk/device-auth?next=%2Fkiosk'
    )
  })

  it('falls back to the request host when no forwarded host exists', () => {
    const request = new Request('http://10.42.0.1/kiosk/device-auth?next=%2Fkiosk', {
      headers: {
        host: '10.42.0.1',
      },
    })

    expect(resolvePublicRequestUrl(request).toString()).toBe(
      'http://10.42.0.1/kiosk/device-auth?next=%2Fkiosk'
    )
  })
})
