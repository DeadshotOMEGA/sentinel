'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateBadgeInput, UpdateBadgeInput } from '@sentinel/contracts'

interface BadgesQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  assignmentType?: string
  assignedOnly?: boolean
  unassignedOnly?: boolean
}

export function useBadges(params: BadgesQueryParams = {}) {
  return useQuery({
    queryKey: ['badges', params],
    queryFn: async () => {
      const response = await apiClient.badges.getBadges({
        query: {
          page: params.page?.toString() ?? '1',
          limit: params.limit?.toString() ?? '50',
          search: params.search,
          status: params.status,
          assignmentType: params.assignmentType,
          assignedOnly: params.assignedOnly ? 'true' : undefined,
          unassignedOnly: params.unassignedOnly ? 'true' : undefined,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch badges')
      }
      return response.body
    },
  })
}

export function useBadgeStats() {
  return useQuery({
    queryKey: ['badge-stats'],
    queryFn: async () => {
      const response = await apiClient.badges.getBadgeStats()
      if (response.status !== 200) {
        throw new Error('Failed to fetch badge stats')
      }
      return response.body
    },
  })
}

export function useCreateBadge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateBadgeInput) => {
      const response = await apiClient.badges.createBadge({
        body: data,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || `Failed to create badge (${response.status})`)
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] })
      queryClient.invalidateQueries({ queryKey: ['badge-stats'] })
    },
  })
}

export function useUpdateBadge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBadgeInput }) => {
      const response = await apiClient.badges.updateBadge({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || `Failed to update badge (${response.status})`)
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['badges'] })
      queryClient.invalidateQueries({ queryKey: ['badge', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['badge-stats'] })
    },
  })
}

export function useDeleteBadge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.badges.deleteBadge({
        params: { id },
      })
      if (response.status !== 200) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || `Failed to delete badge (${response.status})`)
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] })
      queryClient.invalidateQueries({ queryKey: ['badge-stats'] })
    },
  })
}
