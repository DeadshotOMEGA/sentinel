import { afterEach, describe, expect, it } from 'vitest'
import {
  KIOSK_DEVICE_COOKIE_NAME,
  authenticateKioskDeviceApiKey,
  extractKioskDeviceApiKeyFromCookieHeader,
  extractKioskDeviceApiKeyFromCookies,
} from './kiosk-device-auth.js'

const ORIGINAL_KIOSK_DEVICE_API_KEY = process.env.SENTINEL_KIOSK_DEVICE_API_KEY
const ORIGINAL_KIOSK_DEVICE_NAME = process.env.SENTINEL_KIOSK_DEVICE_NAME

describe('kiosk-device-auth', () => {
  afterEach(() => {
    if (ORIGINAL_KIOSK_DEVICE_API_KEY === undefined) {
      delete process.env.SENTINEL_KIOSK_DEVICE_API_KEY
    } else {
      process.env.SENTINEL_KIOSK_DEVICE_API_KEY = ORIGINAL_KIOSK_DEVICE_API_KEY
    }

    if (ORIGINAL_KIOSK_DEVICE_NAME === undefined) {
      delete process.env.SENTINEL_KIOSK_DEVICE_NAME
    } else {
      process.env.SENTINEL_KIOSK_DEVICE_NAME = ORIGINAL_KIOSK_DEVICE_NAME
    }
  })

  it('authenticates the configured kiosk device API key', () => {
    process.env.SENTINEL_KIOSK_DEVICE_API_KEY = 'sk_kiosk_test_123'
    process.env.SENTINEL_KIOSK_DEVICE_NAME = 'Front entrance kiosk'

    expect(authenticateKioskDeviceApiKey('sk_kiosk_test_123')).toEqual({
      id: 'kiosk-device',
      name: 'Front entrance kiosk',
      scopes: ['kiosk:access', 'system-status:read'],
    })
  })

  it('rejects missing, malformed, or incorrect kiosk device API keys', () => {
    delete process.env.SENTINEL_KIOSK_DEVICE_API_KEY
    expect(authenticateKioskDeviceApiKey('sk_kiosk_test_123')).toBeNull()

    process.env.SENTINEL_KIOSK_DEVICE_API_KEY = 'not-prefixed'
    expect(authenticateKioskDeviceApiKey('not-prefixed')).toBeNull()

    process.env.SENTINEL_KIOSK_DEVICE_API_KEY = 'sk_kiosk_test_123'
    expect(authenticateKioskDeviceApiKey('sk_kiosk_test_999')).toBeNull()
    expect(authenticateKioskDeviceApiKey('')).toBeNull()
  })

  it('extracts the kiosk device API key from parsed cookies', () => {
    const cookies = {
      [KIOSK_DEVICE_COOKIE_NAME]: 'sk_kiosk_cookie_value',
    }

    expect(extractKioskDeviceApiKeyFromCookies(cookies)).toBe('sk_kiosk_cookie_value')
  })

  it('extracts and decodes the kiosk device API key from the raw cookie header', () => {
    const cookieHeader = `foo=bar; ${KIOSK_DEVICE_COOKIE_NAME}=sk_kiosk_cookie%5Fvalue`

    expect(extractKioskDeviceApiKeyFromCookieHeader(cookieHeader)).toBe('sk_kiosk_cookie_value')
  })
})
