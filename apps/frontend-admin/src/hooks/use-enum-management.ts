'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateEnum, CreateTag, UpdateEnum, UpdateTag } from '@sentinel/contracts'

export type EnumType = 'visit-types' | 'member-statuses' | 'member-types' | 'badge-statuses' | 'tags'

export interface EnumItem {
  id: string
  code?: string  // Tags don't have code
  name: string
  description: string | null
  color?: string | null
  chipVariant?: string | null
  chipColor?: string | null
  displayOrder?: number  // Only for tags
  usageCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateEnumInput {
  code?: string  // Tags don't have code
  name: string
  description?: string
  color?: string
  chipVariant?: string
  chipColor?: string
  displayOrder?: number
}

export interface UpdateEnumInput {
  code?: string
  name?: string
  description?: string
  color?: string
  chipVariant?: string
  chipColor?: string
  displayOrder?: number
}

/**
 * Hook for fetching all enums of a specific type
 */
export function useEnumList(enumType: EnumType) {
  return useQuery({
    queryKey: ['enums', enumType],
    queryFn: async () => {
      let response
      switch (enumType) {
        case 'visit-types':
          response = await apiClient.enums.visitTypes.getVisitTypes()
          if (response.status !== 200) throw new Error('Failed to fetch visit types')
          return response.body.visitTypes
        case 'member-statuses':
          response = await apiClient.enums.memberStatuses.getMemberStatuses()
          if (response.status !== 200) throw new Error('Failed to fetch member statuses')
          return response.body.memberStatuses
        case 'member-types':
          response = await apiClient.enums.memberTypes.getMemberTypes()
          if (response.status !== 200) throw new Error('Failed to fetch member types')
          return response.body.memberTypes
        case 'badge-statuses':
          response = await apiClient.enums.badgeStatuses.getBadgeStatuses()
          if (response.status !== 200) throw new Error('Failed to fetch badge statuses')
          return response.body.badgeStatuses
        case 'tags':
          response = await apiClient.enums.tags.getTags()
          if (response.status !== 200) throw new Error('Failed to fetch tags')
          return response.body.tags
        default:
          throw new Error(`Unknown enum type: ${enumType}`)
      }
    },
  })
}

/**
 * Hook for creating a new enum item
 */
export function useCreateEnum(enumType: EnumType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEnumInput) => {
      let response
      // For non-tag types, code is required - cast to CreateEnum type
      const enumData = data as unknown as CreateEnum
      switch (enumType) {
        case 'visit-types':
          response = await apiClient.enums.visitTypes.createVisitType({ body: enumData })
          if (response.status !== 201) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to create visit type')
          }
          return response.body.visitType
        case 'member-statuses':
          response = await apiClient.enums.memberStatuses.createMemberStatus({ body: enumData })
          if (response.status !== 201) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to create member status')
          }
          return response.body.memberStatus
        case 'member-types':
          response = await apiClient.enums.memberTypes.createMemberType({ body: enumData })
          if (response.status !== 201) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to create member type')
          }
          return response.body.memberType
        case 'badge-statuses':
          response = await apiClient.enums.badgeStatuses.createBadgeStatus({ body: enumData })
          if (response.status !== 201) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to create badge status')
          }
          return response.body.badgeStatus
        case 'tags':
          response = await apiClient.enums.tags.createTag({ body: data as unknown as CreateTag })
          if (response.status !== 201) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to create tag')
          }
          return response.body.tag
        default:
          throw new Error(`Unknown enum type: ${enumType}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', enumType] })
      queryClient.invalidateQueries({ queryKey: ['enums'] }) // Also invalidate the combined query
    },
  })
}

/**
 * Hook for updating an enum item
 */
export function useUpdateEnum(enumType: EnumType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEnumInput }) => {
      let response
      // Cast to proper contract types
      const enumData = data as unknown as UpdateEnum
      switch (enumType) {
        case 'visit-types':
          response = await apiClient.enums.visitTypes.updateVisitType({ params: { id }, body: enumData })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to update visit type')
          }
          return response.body.visitType
        case 'member-statuses':
          response = await apiClient.enums.memberStatuses.updateMemberStatus({ params: { id }, body: enumData })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to update member status')
          }
          return response.body.memberStatus
        case 'member-types':
          response = await apiClient.enums.memberTypes.updateMemberType({ params: { id }, body: enumData })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to update member type')
          }
          return response.body.memberType
        case 'badge-statuses':
          response = await apiClient.enums.badgeStatuses.updateBadgeStatus({ params: { id }, body: enumData })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to update badge status')
          }
          return response.body.badgeStatus
        case 'tags':
          response = await apiClient.enums.tags.updateTag({ params: { id }, body: data as unknown as UpdateTag })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to update tag')
          }
          return response.body.tag
        default:
          throw new Error(`Unknown enum type: ${enumType}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', enumType] })
      queryClient.invalidateQueries({ queryKey: ['enums'] })
    },
  })
}

/**
 * Hook for deleting an enum item
 */
export function useDeleteEnum(enumType: EnumType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      let response
      switch (enumType) {
        case 'visit-types':
          response = await apiClient.enums.visitTypes.deleteVisitType({ params: { id } })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to delete visit type')
          }
          return response.body
        case 'member-statuses':
          response = await apiClient.enums.memberStatuses.deleteMemberStatus({ params: { id } })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to delete member status')
          }
          return response.body
        case 'member-types':
          response = await apiClient.enums.memberTypes.deleteMemberType({ params: { id } })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to delete member type')
          }
          return response.body
        case 'badge-statuses':
          response = await apiClient.enums.badgeStatuses.deleteBadgeStatus({ params: { id } })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to delete badge status')
          }
          return response.body
        case 'tags':
          response = await apiClient.enums.tags.deleteTag({ params: { id } })
          if (response.status !== 200) {
            const errorBody = response.body as { message?: string }
            throw new Error(errorBody.message || 'Failed to delete tag')
          }
          return response.body
        default:
          throw new Error(`Unknown enum type: ${enumType}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', enumType] })
      queryClient.invalidateQueries({ queryKey: ['enums'] })
    },
  })
}

/**
 * Hook for reordering tags
 */
export function useReorderTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tagIds: string[]) => {
      const response = await apiClient.enums.tags.reorderTags({ body: { tagIds } })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to reorder tags')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enums', 'tags'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}
