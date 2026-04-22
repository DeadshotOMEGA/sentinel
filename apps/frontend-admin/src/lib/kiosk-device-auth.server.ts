/* global process */

const KIOSK_DEVICE_API_KEY_ENV = 'SENTINEL_KIOSK_DEVICE_API_KEY'
const KIOSK_DEVICE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function getConfiguredKioskDeviceApiKey(): string | null {
  const configured = process.env[KIOSK_DEVICE_API_KEY_ENV]?.trim()
  if (!configured) {
    return null
  }

  return configured.startsWith('sk_') ? configured : null
}

export function isKioskDeviceAuthConfigured(): boolean {
  return getConfiguredKioskDeviceApiKey() !== null
}

export function getKioskDeviceCookieMaxAgeSeconds(): number {
  return KIOSK_DEVICE_COOKIE_MAX_AGE_SECONDS
}
