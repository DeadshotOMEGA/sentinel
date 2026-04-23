'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  StartSystemUpdateInput,
  StartSystemUpdateResponse,
  SystemUpdateJob,
  SystemUpdateStatusResponse,
  SystemUpdateTraceResponse,
} from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

const systemUpdateStatusQueryKey = ['system-update', 'status'] as const
const systemUpdateTraceQueryKey = ['system-update', 'trace'] as const

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

async function fetchSystemUpdateStatus(options?: {
  forceRefresh?: boolean
}): Promise<SystemUpdateStatusResponse> {
  const response = await apiClient.systemUpdate.getSystemUpdateStatus(
    options?.forceRefresh ? { query: { forceRefresh: 'true' } } : {}
  )

  if (response.status !== 200) {
    throw new Error(getErrorMessage(response.body, 'Failed to load system update status'))
  }

  return response.body
}

export function useSystemUpdateStatus(options?: { enabled?: boolean; refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: systemUpdateStatusQueryKey,
    queryFn: async (): Promise<SystemUpdateStatusResponse> => fetchSystemUpdateStatus(),
    enabled: options?.enabled,
    refetchInterval: options?.refetchIntervalMs ?? 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

export function useRefreshSystemUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<SystemUpdateStatusResponse> =>
      fetchSystemUpdateStatus({ forceRefresh: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(systemUpdateStatusQueryKey, data)
    },
  })
}

export function useSystemUpdateJob(jobId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['system-update', 'job', jobId] as const,
    queryFn: async (): Promise<SystemUpdateJob> => {
      if (!jobId) {
        throw new Error('System update job ID is required')
      }

      const response = await apiClient.systemUpdate.getSystemUpdateJob({
        params: { jobId },
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load system update job'))
      }

      return response.body
    },
    enabled: Boolean(jobId) && options?.enabled !== false,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

export function useStartSystemUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: StartSystemUpdateInput): Promise<StartSystemUpdateResponse> => {
      const response = await apiClient.systemUpdate.startSystemUpdate({
        body: input,
      })

      if (response.status !== 202) {
        throw new Error(getErrorMessage(response.body, 'Failed to start system update'))
      }

      return response.body
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SystemUpdateStatusResponse | undefined>(
        systemUpdateStatusQueryKey,
        (current) => {
          if (!current) {
            return current
          }

          return {
            ...current,
            currentJob: data.job,
          }
        }
      )
      void queryClient.invalidateQueries({ queryKey: systemUpdateStatusQueryKey })
      void queryClient.invalidateQueries({ queryKey: systemUpdateTraceQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['system-status'] })
      void queryClient.invalidateQueries({ queryKey: ['system-update', 'job', data.job.jobId] })
    },
  })
}

export function useSystemUpdateTrace(options?: {
  enabled?: boolean
  refetchIntervalMs?: number | false
}) {
  return useQuery({
    queryKey: systemUpdateTraceQueryKey,
    queryFn: async (): Promise<SystemUpdateTraceResponse> => {
      const response = await apiClient.systemUpdate.getSystemUpdateTrace()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load update trace log'))
      }

      return response.body
    },
    enabled: options?.enabled,
    refetchInterval: options?.refetchIntervalMs ?? false,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
