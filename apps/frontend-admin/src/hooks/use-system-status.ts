'use client'

import { useQuery } from '@tanstack/react-query'
import type { SystemStatusResponse } from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

const systemStatusQueryKey = ['system-status'] as const

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

export function useSystemStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: systemStatusQueryKey,
    queryFn: async (): Promise<SystemStatusResponse> => {
      const response = await apiClient.systemStatus.getSystemStatus()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load system status'))
      }

      return response.body
    },
    enabled: options?.enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
