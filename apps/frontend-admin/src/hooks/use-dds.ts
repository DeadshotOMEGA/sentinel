'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { websocketManager } from '@/lib/websocket'
import type { SetTodayDdsInput, TransferDdsInput } from '@sentinel/contracts'

function extractErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  return fallback
}

export function useDdsStatus() {
  const query = useQuery({
    queryKey: ['dds-status'],
    queryFn: async () => {
      const response = await apiClient.dds.getCurrentDds()
      if (response.status !== 200) {
        throw new Error('Failed to fetch DDS status')
      }
      return response.body
    },
    refetchInterval: 300000, // Refetch every 5 minutes as fallback
  })

  const { refetch } = query

  useEffect(() => {
    // Connect WebSocket and subscribe to DDS updates
    websocketManager.connect()
    websocketManager.subscribe('dds')
    websocketManager.subscribe('presence')

    const handleDdsUpdate = () => {
      refetch()
    }

    websocketManager.on('dds:update', handleDdsUpdate)
    websocketManager.on('dds:updated', handleDdsUpdate)
    websocketManager.on('presence:update', handleDdsUpdate)

    return () => {
      websocketManager.off('dds:update', handleDdsUpdate)
      websocketManager.off('dds:updated', handleDdsUpdate)
      websocketManager.off('presence:update', handleDdsUpdate)
      websocketManager.unsubscribe('dds')
      websocketManager.unsubscribe('presence')
    }
  }, [refetch])

  return query
}

export function useKioskResponsibilityState(memberId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['dds', 'kiosk-state', memberId],
    queryFn: async () => {
      const response = await apiClient.dds.getKioskResponsibilityState({
        params: { id: memberId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch kiosk responsibility state')
      }
      return response.body
    },
    enabled: enabled && !!memberId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAcceptDds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiClient.dds.acceptDds({
        params: { id: memberId },
      })
      if (response.status !== 200) {
        throw new Error(extractErrorMessage(response.body, 'Failed to accept DDS'))
      }
      return response.body
    },
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['dds-status'] }),
        queryClient.invalidateQueries({ queryKey: ['dds', 'kiosk-state'] }),
        invalidateDashboardQueries(queryClient),
      ])
    },
  })
}

export function useSetTodayDds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SetTodayDdsInput) => {
      const response = await apiClient.dds.setTodayDds({
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(extractErrorMessage(response.body, "Failed to update today's DDS"))
      }
      return response.body
    },
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['dds-status'] }),
        queryClient.invalidateQueries({ queryKey: ['dds', 'current'] }),
        queryClient.invalidateQueries({ queryKey: ['dds', 'kiosk-state'] }),
        invalidateDashboardQueries(queryClient),
      ])
    },
  })
}

export function useTransferDds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransferDdsInput) => {
      const response = await apiClient.dds.transferDds({
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(extractErrorMessage(response.body, 'Failed to transfer DDS'))
      }
      return response.body
    },
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['dds-status'] }),
        queryClient.invalidateQueries({ queryKey: ['dds', 'current'] }),
        queryClient.invalidateQueries({ queryKey: ['dds', 'kiosk-state'] }),
        invalidateDashboardQueries(queryClient),
      ])
    },
  })
}
