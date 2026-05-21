import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { refreshVisitorEventAvailabilityQueries } from '../lib/visitor-event-availability-invalidation'

describe('refreshVisitorEventAvailabilityQueries', () => {
  it('refreshes active and inactive kiosk event option capacity after visitor changes', async () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await refreshVisitorEventAvailabilityQueries(queryClient)

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['kiosk-unit-events'],
      refetchType: 'all',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['kiosk-unit-event'],
      refetchType: 'all',
    })
  })
})
