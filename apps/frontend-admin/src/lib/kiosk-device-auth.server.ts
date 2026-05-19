/* global Headers, Request, URL, process */

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

function getForwardedHeaderValue(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.split(',')[0]?.trim()
  return value && value.length > 0 ? value : null
}

function applyPublicHost(publicUrl: URL, host: string): void {
  try {
    const hostUrl = new URL(`http://${host}`)
    publicUrl.hostname = hostUrl.hostname
    publicUrl.port = hostUrl.port
  } catch {
    publicUrl.host = host
  }
}

export function resolvePublicRequestUrl(request: Request): URL {
  const publicUrl = new URL(request.url)
  const forwardedHost =
    getForwardedHeaderValue(request.headers, 'x-forwarded-host') ??
    getForwardedHeaderValue(request.headers, 'host')

  if (forwardedHost) {
    applyPublicHost(publicUrl, forwardedHost)
  }

  const forwardedProtocol = getForwardedHeaderValue(request.headers, 'x-forwarded-proto')

  if (forwardedProtocol) {
    publicUrl.protocol = forwardedProtocol.endsWith(':')
      ? forwardedProtocol
      : `${forwardedProtocol}:`
  }

  return publicUrl
}
