'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
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
  return useQuery({
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
}
