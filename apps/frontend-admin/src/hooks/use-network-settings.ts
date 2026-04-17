'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NetworkSettings, NetworkSettingsResponse } from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

const networkSettingsQueryKey = ['network-settings'] as const

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

export function useNetworkSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: networkSettingsQueryKey,
    queryFn: async (): Promise<NetworkSettingsResponse> => {
      const response = await apiClient.networkSettings.getNetworkSettings()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load network settings'))
      }

      return response.body
    },
    enabled: options?.enabled,
  })
}

export function useUpdateNetworkSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: NetworkSettings) => {
      const response = await apiClient.networkSettings.updateNetworkSettings({
        body: { settings },
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to update network settings'))
      }

      return response.body
    },
    onSuccess: (data) => {
      queryClient.setQueryData(networkSettingsQueryKey, data)
      void queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })
}

export function useHostHotspotRecovery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.networkSettings.hostHotspotRecovery({
        body: undefined,
      })

      if (response.status !== 202) {
        throw new Error(getErrorMessage(response.body, 'Failed to queue host hotspot recovery'))
      }

      return response.body
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })
}
