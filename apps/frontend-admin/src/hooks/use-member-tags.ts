'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { AssignTagInput } from '@sentinel/contracts'

// ============================================================================
// All Tags
// ============================================================================

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await apiClient.tags.getTags()
      if (response.status !== 200) {
        throw new Error('Failed to fetch tags')
      }
      return response.body.tags
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - tags rarely change
  })
}

// ============================================================================
// Member Tags
// ============================================================================

export function useMemberTags(memberId: string) {
  return useQuery({
    queryKey: ['member-tags', memberId],
    queryFn: async () => {
      const response = await apiClient.tags.getMemberTags({
        params: { memberId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch member tags')
      }
      return response.body.data
    },
    enabled: !!memberId,
  })
}

export function useAssignTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: AssignTagInput }) => {
      const response = await apiClient.tags.assignTag({
        params: { memberId },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to assign tag')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-tags', variables.memberId] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useRemoveTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, tagId }: { memberId: string; tagId: string }) => {
      const response = await apiClient.tags.removeTag({
        params: { memberId, tagId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to remove tag')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-tags', variables.memberId] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
