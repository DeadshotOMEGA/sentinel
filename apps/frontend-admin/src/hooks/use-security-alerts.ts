'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'
import { useAuthStore } from '@/store/auth-store'

export function useSecurityAlerts() {
  const query = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const response = await apiClient.securityAlerts.getActiveAlerts()
      if (response.status !== 200) {
        throw new Error('Failed to fetch security alerts')
      }
      return response.body
    },
    refetchInterval: 60000, // Refetch every minute as fallback
  })

  const { refetch } = query

  useEffect(() => {
    // Connect WebSocket and subscribe to alerts updates
    websocketManager.connect()
    websocketManager.subscribe('alerts')

    const handleAlertUpdate = () => {
      refetch()
    }

    websocketManager.on('alerts:new', handleAlertUpdate)
    websocketManager.on('alerts:acknowledged', handleAlertUpdate)

    return () => {
      websocketManager.off('alerts:new', handleAlertUpdate)
      websocketManager.off('alerts:acknowledged', handleAlertUpdate)
      websocketManager.unsubscribe('alerts')
    }
  }, [refetch])

  return query
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  const member = useAuthStore((s) => s.member)

  return useMutation({
    mutationFn: async ({ alertId, note }: { alertId: string; note?: string }) => {
      if (!member?.id) {
        throw new Error('Not authenticated')
      }
      const response = await apiClient.securityAlerts.acknowledgeAlert({
        params: { id: alertId },
        body: { adminId: member.id, ...(note ? { note } : {}) },
      })
      if (response.status !== 200) {
        throw new Error('Failed to acknowledge alert')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] })
      toast.success('Alert acknowledged')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to acknowledge alert')
    },
  })
}
