import type { QueryClient } from '@tanstack/react-query'

const DASHBOARD_QUERY_KEYS = [
  ['present-people'],
  ['presence'],
  ['dds-status'],
  ['lockup-status'],
  ['eligible-openers'],
  ['lockup-eligible'],
  ['lockup-present'],
  ['checkout-options'],
  ['duty-watch'],
  ['schedules', 'live-assignments'],
  ['security-alerts'],
] as const

// Dashboard freshness audit matrix:
// - Presence cards: ['present-people'], ['presence']
// - DDS widgets/modals: ['dds-status'], ['lockup-eligible']
// - Lockup widgets/modals: ['lockup-status'], ['eligible-openers'], ['lockup-present'], ['checkout-options']
// - Duty watch widgets: ['duty-watch'], ['schedules', 'live-assignments']
// - Security banner: ['security-alerts']
export function invalidateDashboardQueries(queryClient: QueryClient) {
  return Promise.allSettled(
    DASHBOARD_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  )
}
