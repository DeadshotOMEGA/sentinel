'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AccessRulePolicyResponse,
  BulkUpdateAccessRulesInput,
  UpdateAccessRuleInput,
} from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

export const accessRulePolicyQueryKey = ['access-rules', 'policy'] as const
export const allowedAccessRulesQueryKey = ['access-rules', 'allowed'] as const

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

export function useAccessRulePolicy(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accessRulePolicyQueryKey,
    queryFn: async (): Promise<AccessRulePolicyResponse> => {
      const response = await apiClient.accessRules.getPolicy()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load Access Rules'))
      }

      return response.body
    },
    enabled: options?.enabled,
  })
}

export function useAllowedAccessRules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: allowedAccessRulesQueryKey,
    queryFn: async () => {
      const response = await apiClient.accessRules.getAllowedRules()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load allowed Access Rules'))
      }

      return response.body
    },
    enabled: options?.enabled,
  })
}

export function useUpdateAccessRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, input }: { key: string; input: UpdateAccessRuleInput }) => {
      const response = await apiClient.accessRules.updateRule({
        params: { key },
        body: input,
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to update Access Rule'))
      }

      return response.body.rule
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessRulePolicyQueryKey })
      void queryClient.invalidateQueries({ queryKey: allowedAccessRulesQueryKey })
    },
  })
}

export function useBulkUpdateAccessRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkUpdateAccessRulesInput) => {
      const response = await apiClient.accessRules.bulkUpdateRules({
        body: input,
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to update Access Rules'))
      }

      return response.body
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessRulePolicyQueryKey })
      void queryClient.invalidateQueries({ queryKey: allowedAccessRulesQueryKey })
    },
  })
}
