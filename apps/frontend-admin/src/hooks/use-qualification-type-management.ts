'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  CreateQualificationType,
  UpdateQualificationType,
  QualificationTypeResponse,
} from '@sentinel/contracts'

export interface QualificationTypeItem {
  id: string
  code: string
  name: string
  description: string | null
  canReceiveLockup: boolean
  displayOrder: number
  tagId: string | null
  tag: {
    id: string
    name: string
    chipVariant: string
    chipColor: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface CreateQualificationTypeInput {
  code: string
  name: string
  description?: string | null
  canReceiveLockup?: boolean
  displayOrder?: number
  tagId?: string | null
}

export interface UpdateQualificationTypeInput {
  code?: string
  name?: string
  description?: string | null
  canReceiveLockup?: boolean
  displayOrder?: number
  tagId?: string | null
}

/**
 * Hook for fetching all qualification types
 */
export function useQualificationTypeList() {
  return useQuery({
    queryKey: ['qualification-types'],
    queryFn: async () => {
      const response = await apiClient.qualifications.getQualificationTypes()
      if (response.status !== 200) {
        throw new Error('Failed to fetch qualification types')
      }
      return response.body.data as QualificationTypeItem[]
    },
  })
}

/**
 * Hook for creating a new qualification type
 */
export function useCreateQualificationType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateQualificationTypeInput) => {
      const response = await apiClient.qualifications.createQualificationType({
        body: data as CreateQualificationType,
      })
      if (response.status !== 201) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to create qualification type')
      }
      return response.body.qualificationType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualification-types'] })
    },
  })
}

/**
 * Hook for updating a qualification type
 */
export function useUpdateQualificationType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQualificationTypeInput }) => {
      const response = await apiClient.qualifications.updateQualificationType({
        params: { id },
        body: data as UpdateQualificationType,
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to update qualification type')
      }
      return response.body.qualificationType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualification-types'] })
    },
  })
}

/**
 * Hook for deleting a qualification type
 */
export function useDeleteQualificationType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.qualifications.deleteQualificationType({
        params: { id },
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to delete qualification type')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualification-types'] })
    },
  })
}

/**
 * Hook for fetching all tags (for the tag selector)
 */
export function useTagsForSelector() {
  return useQuery({
    queryKey: ['tags-for-selector'],
    queryFn: async () => {
      const response = await apiClient.enums.tags.getTags()
      if (response.status !== 200) {
        throw new Error('Failed to fetch tags')
      }
      return response.body.tags
    },
  })
}
