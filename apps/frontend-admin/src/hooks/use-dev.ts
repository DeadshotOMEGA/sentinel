'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MockScanRequest, SetBuildingStatusRequest } from '@sentinel/contracts'

/**
 * Fetch all members with badge info and presence status (dev only)
 */
export function useDevMembers() {
  return useQuery({
    queryKey: ['dev-members'],
    queryFn: async () => {
      const response = await apiClient.dev.getMembers()
      if (response.status !== 200) {
        throw new Error('Failed to fetch dev members')
      }
      return response.body
    },
  })
}

/**
 * Simulate an RFID badge scan (dev only)
 */
export function useMockScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MockScanRequest) => {
      const response = await apiClient.dev.mockScan({
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to simulate scan')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['present-people'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['dev-members'] })
      queryClient.invalidateQueries({ queryKey: ['duty-watch'] })
    },
  })
}

/**
 * Set building lockup status (dev only)
 */
export function useSetBuildingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SetBuildingStatusRequest) => {
      const response = await apiClient.dev.setBuildingStatus({
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to set building status')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
    },
  })
}

/**
 * Clear all current check-ins (dev only)
 */
export function useClearAllCheckins() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.dev.clearAllCheckins()
      if (response.status !== 200) {
        throw new Error('Failed to clear check-ins')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['present-people'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['recent-checkins'] })
      queryClient.invalidateQueries({ queryKey: ['dev-members'] })
      queryClient.invalidateQueries({ queryKey: ['duty-watch'] })
      queryClient.invalidateQueries({ queryKey: ['dds-status'] })
      queryClient.invalidateQueries({ queryKey: ['lockup-status'] })
    },
  })
}
