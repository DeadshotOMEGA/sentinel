import type { QueryClient } from '@tanstack/react-query'

const DASHBOARD_QUERY_KEYS = [
  ['present-people'],
  ['presence'],
  ['dds-status'],
  ['lockup-status'],
  ['eligible-openers'],
  ['checkout-options'],
  ['duty-watch'],
  ['schedules', 'live-assignments'],
  ['security-alerts'],
] as const

export function invalidateDashboardQueries(queryClient: QueryClient) {
  return Promise.allSettled(
    DASHBOARD_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  )
}
