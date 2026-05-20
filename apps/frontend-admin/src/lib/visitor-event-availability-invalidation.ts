import type { QueryClient } from '@tanstack/react-query'

const kioskUnitEventsQueryKey = ['kiosk-unit-events'] as const
const kioskUnitEventQueryKey = ['kiosk-unit-event'] as const

export function invalidateVisitorEventAvailabilityQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: kioskUnitEventsQueryKey })
  void queryClient.invalidateQueries({ queryKey: kioskUnitEventQueryKey })
}
