'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'
import type { TransferLockupInput, ExecuteLockupInput, OpenBuildingInput } from '@sentinel/contracts'

export function useLockupStatus() {
  const query = useQuery({
    queryKey: ['lockup-status'],
    queryFn: async () => {
      const response = await apiClient.lockup.getStatus()
      if (response.status !== 200) {
        throw new Error('Failed to fetch lockup status')
      }
      return response.body
    },
    refetchInterval: 60000, // Refetch every minute as fallback
  })

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('lockup')

    const handleLockupUpdate = () => {
      query.refetch()
    }

    websocketManager.on('lockup:statusChanged', handleLockupUpdate)
    websocketManager.on('lockup:transferred', handleLockupUpdate)
    websocketManager.on('lockup:executed', handleLockupUpdate)

    return () => {
      websocketManager.off('lockup:statusChanged', handleLockupUpdate)
      websocketManager.off('lockup:transferred', handleLockupUpdate)
      websocketManager.off('lockup:executed', handleLockupUpdate)
      websocketManager.unsubscribe('lockup')
    }
  }, [query])

  return query
}

export function useLockupHistory(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['lockup-history', startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.lockup.getHistory({
        query: {
          startDate,
          endDate,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch lockup history')
      }
      return response.body
    },
  })
}

/**
 * Get checkout options for a member
 * Used to determine if member holds lockup and what options are available
 */
export function useCheckoutOptions(memberId: string) {
  return useQuery({
    queryKey: ['checkout-options', memberId],
    queryFn: async () => {
      const response = await apiClient.lockup.getCheckoutOptions({
        params: { id: memberId },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch checkout options')
      }
      return response.body
    },
    enabled: !!memberId,
  })
}

/**
 * Get present people for lockup confirmation
 */
export function usePresentForLockup() {
  return useQuery({
    queryKey: ['lockup-present'],
    queryFn: async () => {
      const response = await apiClient.lockup.getPresentForLockup()
      if (response.status !== 200) {
        throw new Error('Failed to fetch present people')
      }
      return response.body
    },
  })
}

/**
 * Transfer lockup to another member
 */
export function useTransferLockup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransferLockupInput) => {
      const response = await apiClient.lockup.transferLockup({
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to transfer lockup')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      queryClient.invalidateQueries({ queryKey: ['checkout-options'] })
      queryClient.invalidateQueries({ queryKey: ['lockup-present'] })
    },
  })
}

/**
 * Execute building lockup (bulk checkout all present)
 */
export function useExecuteLockup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: ExecuteLockupInput }) => {
      const response = await apiClient.lockup.executeLockup({
        params: { id: memberId },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to execute lockup')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      queryClient.invalidateQueries({ queryKey: ['checkout-options'] })
      queryClient.invalidateQueries({ queryKey: ['lockup-present'] })
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    },
  })
}

/**
 * Get members eligible to open the building
 */
export function useEligibleOpeners() {
  return useQuery({
    queryKey: ['eligible-openers'],
    queryFn: async () => {
      const response = await apiClient.lockup.getEligibleOpeners()
      if (response.status !== 200) {
        throw new Error('Failed to fetch eligible openers')
      }
      return response.body.openers
    },
  })
}

/**
 * Open building (transition from secured to open)
 */
export function useOpenBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data?: OpenBuildingInput }) => {
      const response = await apiClient.lockup.openBuilding({
        params: { id: memberId },
        body: data ?? {},
      })
      if (response.status !== 200) {
        throw new Error('Failed to open building')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    },
  })
}
