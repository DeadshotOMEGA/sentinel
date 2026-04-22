import { timingSafeEqual } from 'node:crypto'

export const KIOSK_DEVICE_COOKIE_NAME = 'sentinel-kiosk-device'
const KIOSK_DEVICE_API_KEY_ENV = 'SENTINEL_KIOSK_DEVICE_API_KEY'
const KIOSK_DEVICE_NAME_ENV = 'SENTINEL_KIOSK_DEVICE_NAME'
const KIOSK_DEVICE_DEFAULT_NAME = 'Sentinel kiosk'
const KIOSK_DEVICE_DEFAULT_SCOPES = ['kiosk:access', 'system-status:read'] as const

export interface KioskDeviceAuthRecord {
  id: string
  name: string
  scopes: string[]
}

interface KioskDeviceConfig {
  key: string
  auth: KioskDeviceAuthRecord
}

function normalizeConfiguredApiKey(): string | null {
  const configured = process.env[KIOSK_DEVICE_API_KEY_ENV]?.trim()
  if (!configured) {
    return null
  }

  return configured.startsWith('sk_') ? configured : null
}

function normalizeConfiguredName(): string {
  const configured = process.env[KIOSK_DEVICE_NAME_ENV]?.trim()
  return configured && configured.length > 0 ? configured : KIOSK_DEVICE_DEFAULT_NAME
}

function getConfiguredKioskDevice(): KioskDeviceConfig | null {
  const key = normalizeConfiguredApiKey()
  if (!key) {
    return null
  }

  return {
    key,
    auth: {
      id: 'kiosk-device',
      name: normalizeConfiguredName(),
      scopes: [...KIOSK_DEVICE_DEFAULT_SCOPES],
    },
  }
}

function safelyCompare(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(candidateBuffer, expectedBuffer)
}

function normalizeCookieValue(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

export function authenticateKioskDeviceApiKey(
  apiKey: string | null | undefined
): KioskDeviceAuthRecord | null {
  if (typeof apiKey !== 'string') {
    return null
  }

  const candidate = apiKey.trim()
  if (candidate.length === 0) {
    return null
  }

  const configured = getConfiguredKioskDevice()
  if (!configured) {
    return null
  }

  return safelyCompare(candidate, configured.key) ? configured.auth : null
}

export function extractKioskDeviceApiKeyFromCookies(
  cookies: Record<string, unknown> | undefined
): string | null {
  const cookie = cookies?.[KIOSK_DEVICE_COOKIE_NAME]
  return typeof cookie === 'string' ? normalizeCookieValue(cookie) : null
}

export function extractKioskDeviceApiKeyFromCookieHeader(
  cookieHeader: string | string[] | undefined
): string | null {
  if (!cookieHeader) {
    return null
  }

  const rawCookies = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader
  const cookies = rawCookies.split(';')

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=')
    if (name !== KIOSK_DEVICE_COOKIE_NAME) {
      continue
    }

    return normalizeCookieValue(valueParts.join('='))
  }

  return null
}
