'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'

export function usePresentPeople() {
  const query = useQuery({
    queryKey: ['present-people'],
    queryFn: async () => {
      const response = await apiClient.checkins.getPresentPeople()
      if (response.status !== 200) {
        throw new Error('Failed to fetch present people')
      }
      return response.body
    },
    refetchInterval: 30000,
  })

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('checkins')
    websocketManager.subscribe('presence')
    websocketManager.subscribe('visitors')

    const handleUpdate = () => {
      query.refetch()
    }

    // Backend emits 'checkin:new' for all checkin events (broadcast.ts:78)
    websocketManager.on('checkin:new', handleUpdate)
    websocketManager.on('presence:update', handleUpdate)
    websocketManager.on('visitor:signin', handleUpdate)
    websocketManager.on('visitor:signout', handleUpdate)

    return () => {
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.off('visitor:signin', handleUpdate)
      websocketManager.off('visitor:signout', handleUpdate)
      websocketManager.unsubscribe('checkins')
      websocketManager.unsubscribe('presence')
      websocketManager.unsubscribe('visitors')
    }
  }, [query])

  return query
}
