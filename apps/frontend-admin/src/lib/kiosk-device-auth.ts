export const KIOSK_DEVICE_COOKIE_NAME = 'sentinel-kiosk-device'
export const KIOSK_DEVICE_BOOTSTRAP_PATH = '/kiosk/device-auth'

export function hasKioskDeviceCookie(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function isKioskRoute(pathname: string | null | undefined): boolean {
  return pathname === '/kiosk' || pathname?.startsWith('/kiosk/') === true
}

export function isKioskDeviceBootstrapRoute(pathname: string | null | undefined): boolean {
  return pathname === KIOSK_DEVICE_BOOTSTRAP_PATH
}

export function resolveKioskBootstrapNext(
  value: string | null | undefined
): '/kiosk' | `/kiosk${string}` {
  if (!value) {
    return '/kiosk'
  }

  const candidate = value.trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/kiosk'
  }

  if (
    candidate === '/kiosk' ||
    candidate.startsWith('/kiosk/') ||
    candidate.startsWith('/kiosk?')
  ) {
    return candidate as '/kiosk' | `/kiosk${string}`
  }

  return '/kiosk'
}
