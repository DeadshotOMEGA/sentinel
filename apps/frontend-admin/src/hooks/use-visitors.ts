'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateVisitorInput, UpdateVisitorInput } from '@sentinel/contracts'

export function useActiveVisitors() {
  return useQuery({
    queryKey: ['active-visitors'],
    queryFn: async () => {
      const response = await apiClient.visitors.getActiveVisitors()
      if (response.status !== 200) {
        throw new Error('Failed to fetch active visitors')
      }
      return response.body
    },
  })
}

export function useCreateVisitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateVisitorInput) => {
      const response = await apiClient.visitors.createVisitor({
        body: data,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { error?: string; message?: string }
        throw new Error(errorBody?.message || `Failed to sign in visitor (${response.status})`)
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-visitors'] })
      queryClient.invalidateQueries({ queryKey: ['present-people'] })
    },
  })
}

export function useCheckoutVisitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.visitors.checkoutVisitor({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to sign out visitor')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-visitors'] })
      queryClient.invalidateQueries({ queryKey: ['present-people'] })
    },
  })
}

export function useVisitorById(id: string | null) {
  return useQuery({
    queryKey: ['visitor', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error('Visitor ID is required')
      const response = await apiClient.visitors.getVisitorById({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch visitor')
      }
      return response.body
    },
  })
}

export function useUpdateVisitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVisitorInput }) => {
      const response = await apiClient.visitors.updateVisitor({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        const body = response.body as { message?: string }
        throw new Error(body?.message ?? 'Failed to update visitor')
      }
      return response.body
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visitor', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] })
      queryClient.invalidateQueries({ queryKey: ['active-visitors'] })
      queryClient.invalidateQueries({ queryKey: ['present-people'] })
    },
  })
}

export function useAvailableTemporaryBadges() {
  return useQuery({
    queryKey: ['badges', { assignmentType: 'temporary', status: 'active', unassignedOnly: true }],
    queryFn: async () => {
      const response = await apiClient.badges.getBadges({
        query: {
          assignmentType: 'temporary',
          status: 'active',
          unassignedOnly: 'true',
          limit: '100',
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch available badges')
      }
      return response.body.badges
    },
  })
}
