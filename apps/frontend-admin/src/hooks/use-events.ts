'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  CreateUnitEventInput,
  UpdateUnitEventInput,
  CreateUnitEventPositionInput,
  UpdateUnitEventPositionInput,
  CreateUnitEventAssignmentInput,
  UnitEventStatus,
  UnitEventCategory,
} from '@sentinel/contracts'

// ============================================================================
// Event Types
// ============================================================================

export function useEventTypes() {
  return useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const response = await apiClient.unitEvents.listEventTypes()
      if (response.status !== 200) {
        throw new Error('Failed to fetch event types')
      }
      return response.body.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - event types rarely change
  })
}

// ============================================================================
// Unit Events
// ============================================================================

interface UnitEventQueryParams {
  startDate?: string
  endDate?: string
  category?: UnitEventCategory
  status?: UnitEventStatus
  requiresDutyWatch?: string // 'true'/'false' as query string
  limit?: string // number as string for query param
  offset?: string
}

export function useUnitEvents(params: UnitEventQueryParams = {}) {
  return useQuery({
    queryKey: ['unit-events', params],
    queryFn: async () => {
      const response = await apiClient.unitEvents.listUnitEvents({
        query: {
          startDate: params.startDate,
          endDate: params.endDate,
          category: params.category,
          status: params.status,
          requiresDutyWatch: params.requiresDutyWatch,
          limit: params.limit,
          offset: params.offset,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch unit events')
      }
      return response.body
    },
  })
}

export function useUnitEvent(id: string) {
  return useQuery({
    queryKey: ['unit-event', id],
    queryFn: async () => {
      const response = await apiClient.unitEvents.getUnitEvent({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch unit event')
      }
      return response.body
    },
    enabled: !!id,
  })
}

export function useUnitEventsByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['unit-events', 'range', startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.unitEvents.listUnitEvents({
        query: {
          startDate,
          endDate,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch unit events for date range')
      }
      return response.body
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useCreateUnitEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUnitEventInput) => {
      const response = await apiClient.unitEvents.createUnitEvent({
        body: data,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || 'Failed to create unit event')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-events'] })
    },
  })
}

export function useUpdateUnitEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUnitEventInput }) => {
      const response = await apiClient.unitEvents.updateUnitEvent({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to update unit event')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-events'] })
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.id] })
    },
  })
}

export function useDeleteUnitEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.unitEvents.deleteUnitEvent({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete unit event')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-events'] })
    },
  })
}

export function useUpdateUnitEventStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UnitEventStatus }) => {
      const response = await apiClient.unitEvents.updateUnitEventStatus({
        params: { id },
        body: { status },
      })
      if (response.status !== 200) {
        throw new Error('Failed to update unit event status')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-events'] })
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.id] })
    },
  })
}

// ============================================================================
// Event Positions
// ============================================================================

export function useCreateEventPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: CreateUnitEventPositionInput }) => {
      const response = await apiClient.unitEvents.createEventPosition({
        params: { id: eventId },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to create event position')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.eventId] })
    },
  })
}

export function useUpdateEventPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      positionId,
      data,
    }: {
      eventId: string
      positionId: string
      data: UpdateUnitEventPositionInput
    }) => {
      const response = await apiClient.unitEvents.updateEventPosition({
        params: { id: eventId, positionId },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to update event position')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.eventId] })
    },
  })
}

export function useDeleteEventPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, positionId }: { eventId: string; positionId: string }) => {
      const response = await apiClient.unitEvents.deleteEventPosition({
        params: { id: eventId, positionId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete event position')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.eventId] })
    },
  })
}

// ============================================================================
// Event Assignments
// ============================================================================

export function useCreateEventAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: CreateUnitEventAssignmentInput }) => {
      const response = await apiClient.unitEvents.createEventAssignment({
        params: { id: eventId },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to create event assignment')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['unit-events'] })
    },
  })
}

export function useDeleteEventAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, assignmentId }: { eventId: string; assignmentId: string }) => {
      const response = await apiClient.unitEvents.deleteEventAssignment({
        params: { id: eventId, assignmentId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete event assignment')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unit-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['unit-events'] })
    },
  })
}
