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
  return useQuery({
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
