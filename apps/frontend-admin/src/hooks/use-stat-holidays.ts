'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateStatHolidayInput, UpdateStatHolidayInput } from '@sentinel/contracts'

/**
 * Query key for stat holidays
 */
export const statHolidaysKeys = {
  all: ['stat-holidays'] as const,
  list: (filters?: { year?: number; province?: string; activeOnly?: boolean }) =>
    [...statHolidaysKeys.all, 'list', filters] as const,
  detail: (id: string) => [...statHolidaysKeys.all, 'detail', id] as const,
  check: (date: string) => [...statHolidaysKeys.all, 'check', date] as const,
}

/**
 * Fetch all stat holidays with optional filters
 */
export function useStatHolidays(options?: {
  year?: number
  province?: string
  activeOnly?: boolean
}) {
  return useQuery({
    queryKey: statHolidaysKeys.list(options),
    queryFn: async () => {
      const response = await apiClient.statHolidays.getAll({
        query: {
          year: options?.year?.toString(),
          province: options?.province,
          activeOnly: options?.activeOnly?.toString(),
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch stat holidays')
      }
      return response.body
    },
  })
}

/**
 * Fetch a specific stat holiday by ID
 */
export function useStatHoliday(id: string) {
  return useQuery({
    queryKey: statHolidaysKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.statHolidays.getById({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch stat holiday')
      }
      return response.body
    },
    enabled: !!id,
  })
}

/**
 * Check if a specific date is a holiday
 */
export function useIsHoliday(date: string) {
  return useQuery({
    queryKey: statHolidaysKeys.check(date),
    queryFn: async () => {
      const response = await apiClient.statHolidays.isHoliday({
        params: { date },
      })
      if (response.status !== 200) {
        throw new Error('Failed to check holiday status')
      }
      return response.body
    },
    enabled: !!date,
  })
}

/**
 * Create a new stat holiday
 */
export function useCreateStatHoliday() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateStatHolidayInput) => {
      const response = await apiClient.statHolidays.create({
        body: data,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || 'Failed to create stat holiday')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statHolidaysKeys.all })
    },
  })
}

/**
 * Update an existing stat holiday
 */
export function useUpdateStatHoliday() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStatHolidayInput }) => {
      const response = await apiClient.statHolidays.update({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || 'Failed to update stat holiday')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statHolidaysKeys.all })
    },
  })
}

/**
 * Delete a stat holiday
 */
export function useDeleteStatHoliday() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.statHolidays.delete({
        params: { id },
      })
      if (response.status !== 200) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || 'Failed to delete stat holiday')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statHolidaysKeys.all })
    },
  })
}
