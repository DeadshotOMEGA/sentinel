'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'
import type { CreateCheckinInput } from '@sentinel/contracts'

interface CheckinsQueryParams {
  page?: number
  limit?: number
  memberId?: string
  divisionId?: string
  direction?: string
  startDate?: string
  endDate?: string
}

export function useCheckins(params: CheckinsQueryParams = {}) {
  const query = useQuery({
    queryKey: ['checkins', params],
    queryFn: async () => {
      const response = await apiClient.checkins.getCheckins({
        query: {
          page: params.page?.toString() ?? '1',
          limit: params.limit?.toString() ?? '25',
          memberId: params.memberId,
          divisionId: params.divisionId,
          direction: params.direction,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch check-ins')
      }
      return response.body
    },
  })

  const { refetch } = query

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('checkins')
    websocketManager.subscribe('visitors')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('checkin:new', handleUpdate)
    websocketManager.on('visitor:signin', handleUpdate)
    websocketManager.on('visitor:signout', handleUpdate)

    return () => {
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.off('visitor:signin', handleUpdate)
      websocketManager.off('visitor:signout', handleUpdate)
      websocketManager.unsubscribe('checkins')
      websocketManager.unsubscribe('visitors')
    }
  }, [refetch])

  return query
}

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

  const { refetch } = query

  useEffect(() => {
    // Connect WebSocket and subscribe to check-in updates
    websocketManager.connect()
    websocketManager.subscribe('checkins')

    const handleCheckinUpdate = () => {
      refetch()
    }

    websocketManager.on('checkins:in', handleCheckinUpdate)
    websocketManager.on('checkins:out', handleCheckinUpdate)

    return () => {
      websocketManager.off('checkins:in', handleCheckinUpdate)
      websocketManager.off('checkins:out', handleCheckinUpdate)
      websocketManager.unsubscribe('checkins')
    }
  }, [refetch])

  return query
}

export function useRecentActivity() {
  const query = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await apiClient.checkins.getRecentActivity({
        query: {
          limit: '20',
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch recent activity')
      }
      return response.body
    },
    refetchInterval: 30000,
  })

  const { refetch } = query

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('checkins')
    websocketManager.subscribe('visitors')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('checkin:new', handleUpdate)
    websocketManager.on('visitor:signin', handleUpdate)
    websocketManager.on('visitor:signout', handleUpdate)

    return () => {
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.off('visitor:signin', handleUpdate)
      websocketManager.off('visitor:signout', handleUpdate)
      websocketManager.unsubscribe('checkins')
      websocketManager.unsubscribe('visitors')
    }
  }, [refetch])

  return query
}

export function useCreateCheckin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCheckinInput) => {
      const response = await apiClient.checkins.createCheckin({
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to create check-in')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] })
    },
  })
}
