'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  CreateDwOverrideInput,
} from '@sentinel/contracts'

// ============================================================================
// Query Key Factory
// ============================================================================

export const scheduleKeys = {
  all: ['schedules'] as const,
  weeks: () => [...scheduleKeys.all, 'week'] as const,
  week: (date: string) => [...scheduleKeys.weeks(), date] as const,
  ranges: () => [...scheduleKeys.all, 'range'] as const,
  current: () => [...scheduleKeys.all, 'current'] as const,
  detail: (id: string) => ['schedule', id] as const,
  overrides: (scheduleId: string) => [...scheduleKeys.all, 'overrides', scheduleId] as const,
  overridesByNight: (scheduleId: string, nightDate: string) =>
    [...scheduleKeys.overrides(scheduleId), nightDate] as const,
}

// ============================================================================
// Duty Roles
// ============================================================================

export function useDutyRoles() {
  return useQuery({
    queryKey: ['duty-roles'],
    queryFn: async () => {
      const response = await apiClient.schedules.listDutyRoles()
      if (response.status !== 200) {
        throw new Error('Failed to fetch duty roles')
      }
      return response.body
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - duty roles rarely change
  })
}

export function useDutyRole(id: string) {
  return useQuery({
    queryKey: ['duty-role', id],
    queryFn: async () => {
      const response = await apiClient.schedules.getDutyRole({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch duty role')
      }
      return response.body
    },
    enabled: !!id,
  })
}

export function useDutyRolePositions(dutyRoleId: string) {
  return useQuery({
    queryKey: ['duty-role-positions', dutyRoleId],
    queryFn: async () => {
      const response = await apiClient.schedules.getDutyRolePositions({
        params: { id: dutyRoleId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch duty role positions')
      }
      return response.body
    },
    enabled: !!dutyRoleId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ============================================================================
// Weekly Schedules
// ============================================================================

interface ScheduleListParams {
  weekStartDate?: string
  dutyRoleId?: string
  status?: 'draft' | 'published'
}

export function useSchedules(params: ScheduleListParams = {}) {
  return useQuery({
    queryKey: [...scheduleKeys.all, params],
    queryFn: async () => {
      const response = await apiClient.schedules.listSchedules({
        query: {
          weekStartDate: params.weekStartDate,
          dutyRoleId: params.dutyRoleId,
          status: params.status,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch schedules')
      }
      return response.body
    },
  })
}

export function useSchedulesByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [...scheduleKeys.ranges(), startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.schedules.listSchedules({
        query: {
          weekStartDate: startDate,
          weekEndDate: endDate,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch schedules for date range')
      }
      return response.body
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useCurrentSchedules() {
  return useQuery({
    queryKey: scheduleKeys.current(),
    queryFn: async () => {
      const response = await apiClient.schedules.getCurrentSchedules()
      if (response.status !== 200) {
        throw new Error('Failed to fetch current schedules')
      }
      return response.body
    },
  })
}

export function useSchedulesByWeek(date: string) {
  return useQuery({
    queryKey: scheduleKeys.week(date),
    queryFn: async () => {
      const response = await apiClient.schedules.getSchedulesByWeek({
        params: { date },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch schedules for week')
      }
      return response.body
    },
    enabled: !!date,
  })
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.schedules.getSchedule({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch schedule')
      }
      return response.body
    },
    enabled: !!id,
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateScheduleInput) => {
      const response = await apiClient.schedules.createSchedule({
        body: data,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || 'Failed to create schedule')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateScheduleInput }) => {
      const response = await apiClient.schedules.updateSchedule({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to update schedule')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.id) })
    },
  })
}

export function usePublishSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.schedules.publishSchedule({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to publish schedule')
      }
      return response.body
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) })
    },
  })
}

export function useRevertToDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.schedules.revertToDraft({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to revert schedule to draft')
      }
      return response.body
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) })
    },
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.schedules.deleteSchedule({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete schedule')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

// ============================================================================
// Schedule Assignments
// ============================================================================

export function useCreateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scheduleId,
      data,
    }: {
      scheduleId: string
      data: CreateAssignmentInput
    }) => {
      const response = await apiClient.schedules.createAssignment({
        params: { id: scheduleId },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to create assignment')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) })
    },
  })
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scheduleId,
      assignmentId,
      data,
    }: {
      scheduleId: string
      assignmentId: string
      data: UpdateAssignmentInput
    }) => {
      const response = await apiClient.schedules.updateAssignment({
        params: { id: scheduleId, assignmentId },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to update assignment')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) })
    },
  })
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scheduleId,
      assignmentId,
    }: {
      scheduleId: string
      assignmentId: string
    }) => {
      const response = await apiClient.schedules.deleteAssignment({
        params: { id: scheduleId, assignmentId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete assignment')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) })
    },
  })
}

// ============================================================================
// DDS Convenience
// ============================================================================

export function useCurrentDds() {
  return useQuery({
    queryKey: ['dds', 'current'],
    queryFn: async () => {
      const response = await apiClient.schedules.getCurrentDdsFromSchedule()
      if (response.status !== 200) {
        throw new Error('Failed to fetch current DDS')
      }
      return response.body
    },
  })
}

export function useDdsByWeek(date: string) {
  return useQuery({
    queryKey: ['dds', 'week', date],
    queryFn: async () => {
      const response = await apiClient.schedules.getDdsByWeek({
        params: { date },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch DDS for week')
      }
      return response.body
    },
    enabled: !!date,
  })
}

// ============================================================================
// Duty Watch Convenience
// ============================================================================

export function useCurrentDutyWatch() {
  return useQuery({
    queryKey: ['duty-watch', 'current'],
    queryFn: async () => {
      const response = await apiClient.schedules.getCurrentDutyWatch()
      if (response.status !== 200) {
        throw new Error('Failed to fetch current Duty Watch')
      }
      return response.body
    },
  })
}

// ============================================================================
// DW Night Overrides
// ============================================================================

export function useDwOverrides(scheduleId: string, nightDate?: string) {
  return useQuery({
    queryKey: nightDate
      ? scheduleKeys.overridesByNight(scheduleId, nightDate)
      : scheduleKeys.overrides(scheduleId),
    queryFn: async () => {
      const response = await apiClient.schedules.listDwOverrides({
        params: { id: scheduleId },
        query: { nightDate },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch overrides')
      }
      return response.body
    },
    enabled: !!scheduleId,
  })
}

export function useCreateDwOverride() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scheduleId,
      data,
    }: {
      scheduleId: string
      data: CreateDwOverrideInput
    }) => {
      const response = await apiClient.schedules.createDwOverride({
        params: { id: scheduleId },
        body: data,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || 'Failed to create override')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

export function useDeleteDwOverride() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      scheduleId,
      overrideId,
    }: {
      scheduleId: string
      overrideId: string
    }) => {
      const response = await apiClient.schedules.deleteDwOverride({
        params: { id: scheduleId, overrideId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete override')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

export function useTonightDutyWatch() {
  const query = useQuery({
    queryKey: ['duty-watch', 'tonight'],
    queryFn: async () => {
      const response = await apiClient.schedules.getTonightDutyWatch()
      if (response.status !== 200) {
        throw new Error('Failed to fetch tonight Duty Watch')
      }
      return response.body
    },
    refetchInterval: 60000, // Refetch every minute as fallback
  })

  const { refetch } = query

  useEffect(() => {
    // Connect WebSocket and subscribe to presence updates
    // When team members check in/out, refresh the duty watch data
    websocketManager.connect()
    websocketManager.subscribe('presence')
    websocketManager.subscribe('schedules')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('presence:update', handleUpdate)
    websocketManager.on('schedules:updated', handleUpdate)

    return () => {
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.off('schedules:updated', handleUpdate)
      websocketManager.unsubscribe('presence')
      websocketManager.unsubscribe('schedules')
    }
  }, [refetch])

  return query
}
