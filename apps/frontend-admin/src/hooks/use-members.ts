'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateMemberInput, UpdateMemberInput } from '@sentinel/contracts'

interface MembersQueryParams {
  page?: number
  limit?: number
  divisionId?: string
  rank?: string
  status?: string
  search?: string
  qualificationCode?: string
}

export function useMembers(params: MembersQueryParams = {}) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: async () => {
      const response = await apiClient.members.getMembers({
        query: {
          page: params.page?.toString() ?? '1',
          limit: params.limit?.toString() ?? '25',
          divisionId: params.divisionId,
          rank: params.rank,
          status: params.status,
          search: params.search,
          qualificationCode: params.qualificationCode,
        },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch members')
      }
      return response.body
    },
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const response = await apiClient.members.getMemberById({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch member')
      }
      return response.body
    },
    enabled: !!id,
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMemberInput) => {
      const response = await apiClient.members.createMember({
        body: data,
      })
      if (response.status !== 201) {
        throw new Error('Failed to create member')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMemberInput }) => {
      const response = await apiClient.members.updateMember({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to update member')
      }
      return response.body
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['member', variables.id] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.members.deleteMember({
        params: { id },
      })
      if (response.status !== 200) {
        throw new Error('Failed to delete member')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useImportPreview() {
  return useMutation({
    mutationFn: async (csvText: string) => {
      const response = await apiClient.members.previewImport({
        body: { csvText },
      })
      if (response.status !== 200) {
        throw new Error('Failed to preview import')
      }
      return response.body
    },
  })
}

export function useExecuteImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      csvText: string
      deactivateIds?: string[]
      excludeRows?: number[]
      createDivisions?: boolean
    }) => {
      const response = await apiClient.members.executeImport({
        body: data,
      })
      if (response.status !== 200) {
        throw new Error('Failed to execute import')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['divisions'] })
    },
  })
}
