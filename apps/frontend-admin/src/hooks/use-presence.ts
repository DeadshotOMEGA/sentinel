'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'

export function usePresence() {
  const query = useQuery({
    queryKey: ['presence'],
    queryFn: async () => {
      const response = await apiClient.checkins.getPresenceStatus()
      if (response.status !== 200) {
        throw new Error('Failed to fetch presence data')
      }
      return response.body
    },
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  })

  useEffect(() => {
    // Connect WebSocket and subscribe to presence updates
    websocketManager.connect()
    websocketManager.subscribe('presence')

    const handlePresenceUpdate = () => {
      query.refetch()
    }

    websocketManager.on('presence:update', handlePresenceUpdate)

    return () => {
      websocketManager.off('presence:update', handlePresenceUpdate)
      websocketManager.unsubscribe('presence')
    }
  }, [query])

  return query
}
