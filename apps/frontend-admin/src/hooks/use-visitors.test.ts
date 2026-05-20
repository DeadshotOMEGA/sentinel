import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { invalidateVisitorEventAvailabilityQueries } from '../lib/visitor-event-availability-invalidation'

describe('invalidateVisitorEventAvailabilityQueries', () => {
  it('refreshes kiosk event option capacity after visitor sign-ins', () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    invalidateVisitorEventAvailabilityQueries(queryClient)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['kiosk-unit-events'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['kiosk-unit-event'] })
  })
})
