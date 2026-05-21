import type { QueryClient } from '@tanstack/react-query'

const kioskUnitEventsQueryKey = ['kiosk-unit-events'] as const
const kioskUnitEventQueryKey = ['kiosk-unit-event'] as const

export async function refreshVisitorEventAvailabilityQueries(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: kioskUnitEventsQueryKey,
      refetchType: 'all',
    }),
    queryClient.invalidateQueries({
      queryKey: kioskUnitEventQueryKey,
      refetchType: 'all',
    }),
  ])
}

export function invalidateVisitorEventAvailabilityQueries(queryClient: QueryClient): void {
  void refreshVisitorEventAvailabilityQueries(queryClient)
}
