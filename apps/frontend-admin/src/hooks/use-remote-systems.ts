'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminRemoteSystem,
  CreateRemoteSystemInput,
  RemoteSystemsResponse,
  UpdateRemoteSystemInput,
} from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

const remoteSystemsQueryKey = ['remote-systems'] as const
const adminRemoteSystemsQueryKey = ['remote-systems', 'admin'] as const

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

export function useRemoteSystems(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: remoteSystemsQueryKey,
    queryFn: async (): Promise<RemoteSystemsResponse> => {
      const response = await apiClient.remoteSystems.listRemoteSystems()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load remote systems'))
      }

      return response.body
    },
    enabled: options?.enabled,
    staleTime: 60_000,
  })
}

export function useAdminRemoteSystems(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminRemoteSystemsQueryKey,
    queryFn: async (): Promise<AdminRemoteSystem[]> => {
      const response = await apiClient.remoteSystems.listAdminRemoteSystems()

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to load remote systems'))
      }

      return response.body.systems
    },
    enabled: options?.enabled,
  })
}

export function useCreateRemoteSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateRemoteSystemInput) => {
      const response = await apiClient.remoteSystems.createRemoteSystem({
        body: input,
      })

      if (response.status !== 201) {
        throw new Error(getErrorMessage(response.body, 'Failed to create remote system'))
      }

      return response.body.system
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: remoteSystemsQueryKey })
      void queryClient.invalidateQueries({ queryKey: adminRemoteSystemsQueryKey })
    },
  })
}

export function useUpdateRemoteSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRemoteSystemInput }) => {
      const response = await apiClient.remoteSystems.updateRemoteSystem({
        params: { id },
        body: input,
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to update remote system'))
      }

      return response.body.system
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: remoteSystemsQueryKey })
      void queryClient.invalidateQueries({ queryKey: adminRemoteSystemsQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['system-status'] })
    },
  })
}

export function useDeleteRemoteSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.remoteSystems.deleteRemoteSystem({
        params: { id },
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to delete remote system'))
      }

      return response.body
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: remoteSystemsQueryKey })
      void queryClient.invalidateQueries({ queryKey: adminRemoteSystemsQueryKey })
    },
  })
}

export function useReorderRemoteSystems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (remoteSystemIds: string[]) => {
      const response = await apiClient.remoteSystems.reorderRemoteSystems({
        body: { remoteSystemIds },
      })

      if (response.status !== 200) {
        throw new Error(getErrorMessage(response.body, 'Failed to reorder remote systems'))
      }

      return response.body
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: remoteSystemsQueryKey })
      void queryClient.invalidateQueries({ queryKey: adminRemoteSystemsQueryKey })
    },
  })
}
