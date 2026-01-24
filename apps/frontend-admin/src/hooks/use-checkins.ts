'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'

export function useRecentCheckins() {
  const query = useQuery({
    queryKey: ['recent-checkins'],
    queryFn: async () => {
      const response = await apiClient.checkins.getCheckins({
        query: {
          limit: '20',
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch recent check-ins')
      }
      return response.body
    },
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  })

  useEffect(() => {
    // Connect WebSocket and subscribe to check-in updates
    websocketManager.connect()
    websocketManager.subscribe('checkins')

    const handleCheckinUpdate = () => {
      query.refetch()
    }

    websocketManager.on('checkins:in', handleCheckinUpdate)
    websocketManager.on('checkins:out', handleCheckinUpdate)

    return () => {
      websocketManager.off('checkins:in', handleCheckinUpdate)
      websocketManager.off('checkins:out', handleCheckinUpdate)
      websocketManager.unsubscribe('checkins')
    }
  }, [query])

  return query
}
