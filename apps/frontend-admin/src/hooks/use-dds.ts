'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'

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

    const handleDdsUpdate = () => {
      refetch()
    }

    websocketManager.on('dds:updated', handleDdsUpdate)

    return () => {
      websocketManager.off('dds:updated', handleDdsUpdate)
      websocketManager.unsubscribe('dds')
    }
  }, [refetch])

  return query
}
