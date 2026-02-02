'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateVisitorInput } from '@sentinel/contracts'

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
