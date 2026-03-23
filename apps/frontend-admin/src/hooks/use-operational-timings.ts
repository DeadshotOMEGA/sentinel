'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OperationalTimingsResponse, OperationalTimingsSettings } from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

const operationalTimingsQueryKey = ['operational-timings'] as const

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }
  return fallback
}

export function useOperationalTimings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: operationalTimingsQueryKey,
    queryFn: async () => {
      const response = await apiClient.operationalTimings.getOperationalTimings()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load operational timings'))
      }

      return response.body
    },
    enabled: options?.enabled,
  })
}

export function useUpdateOperationalTimings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: OperationalTimingsSettings) => {
      const response = await apiClient.operationalTimings.updateOperationalTimings({
        body: { settings },
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to update operational timings'))
      }

      return response.body
    },
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: operationalTimingsQueryKey })
      const previous = queryClient.getQueryData<OperationalTimingsResponse>(
        operationalTimingsQueryKey
      )

      if (previous) {
        queryClient.setQueryData<OperationalTimingsResponse>(operationalTimingsQueryKey, {
          settings,
          metadata: {
            source: 'stored',
            updatedAt: previous.metadata.updatedAt,
          },
        })
      }

      return { previous }
    },
    onError: (_error, _settings, context) => {
      if (context?.previous) {
        queryClient.setQueryData(operationalTimingsQueryKey, context.previous)
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(operationalTimingsQueryKey, data)
    },
  })
}
