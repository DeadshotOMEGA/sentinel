/* global URLSearchParams */

export type PostLoginDestination = '/dashboard' | '/kiosk'

const DASHBOARD_DESTINATION: PostLoginDestination = '/dashboard'
const KIOSK_DESTINATION: PostLoginDestination = '/kiosk'

function getSearchParam(
  search: string | URLSearchParams | null | undefined,
  key: 'destination' | 'redirect'
): string | null {
  if (!search) {
    return null
  }

  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search

  return params.get(key)
}

export function resolvePostLoginDestination(
  value: string | null | undefined
): PostLoginDestination {
  return value === KIOSK_DESTINATION ? KIOSK_DESTINATION : DASHBOARD_DESTINATION
}

export function isKioskDestination(destination: PostLoginDestination): boolean {
  return destination === KIOSK_DESTINATION
}

export function inferPostLoginDestinationFromPath(
  pathname: string | null | undefined
): PostLoginDestination {
  return pathname?.startsWith(KIOSK_DESTINATION) ? KIOSK_DESTINATION : DASHBOARD_DESTINATION
}

export function resolvePostLoginDestinationHint(
  pathname: string | null | undefined,
  search?: string | URLSearchParams | null
): PostLoginDestination {
  const hintedDestination =
    getSearchParam(search, 'destination') ?? getSearchParam(search, 'redirect')

  if (hintedDestination) {
    return resolvePostLoginDestination(hintedDestination)
  }

  return inferPostLoginDestinationFromPath(pathname)
}

export function buildLoginUrl(
  pathname: string | null | undefined,
  search?: string | URLSearchParams | null
): string {
  const destination = resolvePostLoginDestinationHint(pathname, search)

  return isKioskDestination(destination)
    ? `/login?destination=${encodeURIComponent(destination)}`
    : '/login'
}

/**
 * Build the login URL used when a previously valid session is revoked/expired.
 * We intentionally reset to the default dashboard destination instead of
 * inferring kiosk intent from the current path.
 */
export function buildForcedReauthLoginUrl(): '/login' {
  return '/login'
}

export function buildChangePinRequiredUrl(
  pathname: string | null | undefined,
  search?: string | URLSearchParams | null
): string {
  const destination = resolvePostLoginDestinationHint(pathname, search)

  return isKioskDestination(destination)
    ? `/change-pin-required?destination=${encodeURIComponent(destination)}`
    : '/change-pin-required'
}
