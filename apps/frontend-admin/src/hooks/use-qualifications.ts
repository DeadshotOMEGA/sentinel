'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { websocketManager } from '@/lib/websocket'
import type { GrantQualificationInput, RevokeQualificationInput } from '@sentinel/contracts'

// ============================================================================
// Qualification Types
// ============================================================================

export function useQualificationTypes() {
  return useQuery({
    queryKey: ['qualification-types'],
    queryFn: async () => {
      const response = await apiClient.qualifications.getQualificationTypes()
      if (response.status !== 200) {
        throw new Error('Failed to fetch qualification types')
      }
      return response.body.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - qualification types rarely change
  })
}

// ============================================================================
// Member Qualifications
// ============================================================================

export function useMemberQualifications(memberId: string) {
  return useQuery({
    queryKey: ['member-qualifications', memberId],
    queryFn: async () => {
      const response = await apiClient.qualifications.getMemberQualifications({
        params: { memberId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch member qualifications')
      }
      return response.body
    },
    enabled: !!memberId,
  })
}

export function useGrantQualification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: GrantQualificationInput }) => {
      const response = await apiClient.qualifications.grantQualification({
        params: { memberId },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to grant qualification')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-qualifications', variables.memberId] })
      queryClient.invalidateQueries({ queryKey: ['lockup-eligible'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      void invalidateDashboardQueries(queryClient)
    },
  })
}

export function useRevokeQualification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memberId,
      qualificationId,
      data,
    }: {
      memberId: string
      qualificationId: string
      data: RevokeQualificationInput
    }) => {
      const response = await apiClient.qualifications.revokeQualification({
        params: { memberId, qualificationId },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to revoke qualification')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-qualifications', variables.memberId] })
      queryClient.invalidateQueries({ queryKey: ['lockup-eligible'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      void invalidateDashboardQueries(queryClient)
    },
  })
}

// ============================================================================
// Auto-Qualification Sync
// ============================================================================

export function useSyncAllAutoQualifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.qualifications.syncAllAutoQualifications()
      if (response.status !== 200) {
        throw new Error('Failed to sync auto-qualifications')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-qualifications'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['lockup-eligible'] })
      void invalidateDashboardQueries(queryClient)
    },
  })
}

// ============================================================================
// Lockup Eligibility
// ============================================================================

interface LockupEligibilityParams {
  checkedInOnly?: boolean
}

export function useLockupEligibleMembers(params: LockupEligibilityParams = {}) {
  const query = useQuery({
    queryKey: ['lockup-eligible', params],
    queryFn: async () => {
      const response = await apiClient.qualifications.getLockupEligibleMembers({
        query: {
          checkedInOnly: params.checkedInOnly?.toString(),
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch lockup-eligible members')
      }
      return response.body
    },
  })

  const { refetch } = query

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('presence')
    websocketManager.subscribe('checkins')
    websocketManager.subscribe('lockup')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('presence:update', handleUpdate)
    websocketManager.on('checkin:new', handleUpdate)
    websocketManager.on('lockup:status', handleUpdate)
    websocketManager.on('lockup:statusChanged', handleUpdate)

    return () => {
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.off('lockup:status', handleUpdate)
      websocketManager.off('lockup:statusChanged', handleUpdate)
      websocketManager.unsubscribe('presence')
      websocketManager.unsubscribe('checkins')
      websocketManager.unsubscribe('lockup')
    }
  }, [refetch])

  return query
}
