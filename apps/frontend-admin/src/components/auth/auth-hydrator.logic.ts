export function shouldIgnoreStaleUnauthorizedSessionCheck(input: {
  wasAuthenticatedAtRequestStart: boolean
  isAuthenticatedNow: boolean
}): boolean {
  const { wasAuthenticatedAtRequestStart, isAuthenticatedNow } = input
  return !wasAuthenticatedAtRequestStart && isAuthenticatedNow
}
