'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import { websocketManager } from '@/lib/websocket'
import type {
  TransferLockupInput,
  ExecuteLockupInput,
  OpenBuildingInput,
  VerifyBadgeInput,
} from '@sentinel/contracts'

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

  const { refetch } = query

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('lockup')

    const handleLockupUpdate = () => {
      refetch()
    }

    websocketManager.on('lockup:status', handleLockupUpdate)
    websocketManager.on('lockup:statusChanged', handleLockupUpdate)
    websocketManager.on('lockup:transferred', handleLockupUpdate)
    websocketManager.on('lockup:executed', handleLockupUpdate)

    return () => {
      websocketManager.off('lockup:status', handleLockupUpdate)
      websocketManager.off('lockup:statusChanged', handleLockupUpdate)
      websocketManager.off('lockup:transferred', handleLockupUpdate)
      websocketManager.off('lockup:executed', handleLockupUpdate)
      websocketManager.unsubscribe('lockup')
    }
  }, [refetch])

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
  const query = useQuery({
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

  const { refetch } = query

  useEffect(() => {
    if (!memberId) {
      return
    }

    websocketManager.connect()
    websocketManager.subscribe('lockup')
    websocketManager.subscribe('presence')
    websocketManager.subscribe('checkins')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('lockup:status', handleUpdate)
    websocketManager.on('lockup:statusChanged', handleUpdate)
    websocketManager.on('lockup:transferred', handleUpdate)
    websocketManager.on('lockup:executed', handleUpdate)
    websocketManager.on('presence:update', handleUpdate)
    websocketManager.on('checkin:new', handleUpdate)

    return () => {
      websocketManager.off('lockup:status', handleUpdate)
      websocketManager.off('lockup:statusChanged', handleUpdate)
      websocketManager.off('lockup:transferred', handleUpdate)
      websocketManager.off('lockup:executed', handleUpdate)
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.unsubscribe('lockup')
      websocketManager.unsubscribe('presence')
      websocketManager.unsubscribe('checkins')
    }
  }, [memberId, refetch])

  return query
}

/**
 * Get present people for lockup confirmation
 */
export function usePresentForLockup(excludeMemberId?: string) {
  const query = useQuery({
    queryKey: ['lockup-present', excludeMemberId ?? null],
    queryFn: async () => {
      const response = await apiClient.lockup.getPresentForLockup({
        query: excludeMemberId ? { excludeMemberId } : {},
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch present people')
      }
      return response.body
    },
  })

  const { refetch } = query

  useEffect(() => {
    websocketManager.connect()
    websocketManager.subscribe('presence')
    websocketManager.subscribe('checkins')
    websocketManager.subscribe('lockup')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('presence:update', handleUpdate)
    websocketManager.on('checkin:new', handleUpdate)
    websocketManager.on('lockup:status', handleUpdate)
    websocketManager.on('lockup:statusChanged', handleUpdate)

    return () => {
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.off('lockup:status', handleUpdate)
      websocketManager.off('lockup:statusChanged', handleUpdate)
      websocketManager.unsubscribe('presence')
      websocketManager.unsubscribe('checkins')
      websocketManager.unsubscribe('lockup')
    }
  }, [refetch])

  return query
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
      void invalidateDashboardQueries(queryClient)
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
        const body = response.body as { message?: string }
        throw new Error(body.message ?? 'Failed to execute lockup')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
      queryClient.invalidateQueries({ queryKey: ['checkout-options'] })
      queryClient.invalidateQueries({ queryKey: ['lockup-present'] })
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      void invalidateDashboardQueries(queryClient)
    },
  })
}

/**
 * Get members eligible to open the building
 */
export function useEligibleOpeners(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['eligible-openers'],
    queryFn: async () => {
      const response = await apiClient.lockup.getEligibleOpeners()
      if (response.status !== 200) {
        throw new Error('Failed to fetch eligible openers')
      }
      return response.body.openers
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { refetch } = query
  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled) {
      return
    }

    websocketManager.connect()
    websocketManager.subscribe('presence')
    websocketManager.subscribe('checkins')
    websocketManager.subscribe('lockup')

    const handleUpdate = () => {
      refetch()
    }

    websocketManager.on('presence:update', handleUpdate)
    websocketManager.on('checkin:new', handleUpdate)
    websocketManager.on('lockup:status', handleUpdate)
    websocketManager.on('lockup:statusChanged', handleUpdate)
    websocketManager.on('lockup:transferred', handleUpdate)
    websocketManager.on('lockup:executed', handleUpdate)

    return () => {
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.off('checkin:new', handleUpdate)
      websocketManager.off('lockup:status', handleUpdate)
      websocketManager.off('lockup:statusChanged', handleUpdate)
      websocketManager.off('lockup:transferred', handleUpdate)
      websocketManager.off('lockup:executed', handleUpdate)
      websocketManager.unsubscribe('presence')
      websocketManager.unsubscribe('checkins')
      websocketManager.unsubscribe('lockup')
    }
  }, [enabled, refetch])

  return query
}

/**
 * Verify badge authorization for lockup transfer
 * Checks if scanned badge belongs to current holder or Admin/Developer.
 * Does NOT create any checkin record.
 */
export function useVerifyBadge() {
  return useMutation({
    mutationFn: async (data: VerifyBadgeInput) => {
      const response = await apiClient.lockup.verifyBadge({
        body: data,
      })
      if (response.status === 403 || response.status === 404) {
        throw new Error('Badge not found or not assigned to a member')
      }
      if (response.status !== 200) {
        throw new Error('Failed to verify badge')
      }
      return response.body
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
      queryClient.invalidateQueries({ queryKey: ['eligible-openers'] })
      void invalidateDashboardQueries(queryClient)
    },
  })
}
