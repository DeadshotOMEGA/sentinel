export function shouldIgnoreStaleUnauthorizedSessionCheck(input: {
  wasAuthenticatedAtRequestStart: boolean
  isAuthenticatedNow: boolean
}): boolean {
  const { wasAuthenticatedAtRequestStart, isAuthenticatedNow } = input
  return !wasAuthenticatedAtRequestStart && isAuthenticatedNow
}

export function shouldRunSessionHeartbeat(input: {
  isAuthenticated: boolean
  pathname: string
}): boolean {
  const { isAuthenticated, pathname } = input
  return isAuthenticated && pathname !== '/login'
}
