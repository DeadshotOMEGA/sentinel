export function shouldIgnoreStaleUnauthorizedSessionCheck(input: {
  wasAuthenticatedAtRequestStart: boolean
  isAuthenticatedNow: boolean
  sessionIdAtRequestStart?: string | null
  sessionIdNow?: string | null
}): boolean {
  const {
    wasAuthenticatedAtRequestStart,
    isAuthenticatedNow,
    sessionIdAtRequestStart = null,
    sessionIdNow = null,
  } = input

  if (!isAuthenticatedNow) {
    return false
  }

  if (!wasAuthenticatedAtRequestStart) {
    return true
  }

  return Boolean(
    sessionIdAtRequestStart && sessionIdNow && sessionIdAtRequestStart !== sessionIdNow
  )
}

export function shouldRunSessionHeartbeat(input: {
  isAuthenticated: boolean
  pathname: string
}): boolean {
  const { isAuthenticated, pathname } = input
  return isAuthenticated && pathname !== '/login'
}
