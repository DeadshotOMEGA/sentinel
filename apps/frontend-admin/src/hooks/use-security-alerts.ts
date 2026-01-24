'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'

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

  useEffect(() => {
    // Connect WebSocket and subscribe to alerts updates
    websocketManager.connect()
    websocketManager.subscribe('alerts')

    const handleAlertUpdate = () => {
      query.refetch()
    }

    websocketManager.on('alerts:new', handleAlertUpdate)
    websocketManager.on('alerts:acknowledged', handleAlertUpdate)

    return () => {
      websocketManager.off('alerts:new', handleAlertUpdate)
      websocketManager.off('alerts:acknowledged', handleAlertUpdate)
      websocketManager.unsubscribe('alerts')
    }
  }, [query])

  return query
}
