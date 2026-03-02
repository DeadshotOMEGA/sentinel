'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  CreateAdminUser,
  UpdateAdminUser,
  ResetPassword,
  AdminUserResponse,
} from '@sentinel/contracts'

interface AdminUsersQueryParams {
  search?: string
  role?: 'quartermaster' | 'admin' | 'developer' | 'all'
  includeDisabled?: boolean
}

export function useAdminUsers(_params: AdminUsersQueryParams = {}) {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await apiClient.adminUsers.getAdminUsers()
      if (response.status !== 200) {
        const body = response.body as { message?: string }
        throw new Error(body.message || 'Failed to fetch admin users')
      }
      return response.body.users
    },
  })
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateAdminUser): Promise<AdminUserResponse> => {
      const response = await apiClient.adminUsers.createAdminUser({ body })
      if (response.status !== 201) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to create admin user')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: UpdateAdminUser
    }): Promise<AdminUserResponse> => {
      const response = await apiClient.adminUsers.updateAdminUser({
        params: { id },
        body,
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to update admin user')
      }
      return response.body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useResetAdminUserPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ResetPassword }): Promise<void> => {
      const response = await apiClient.adminUsers.resetAdminUserPassword({
        params: { id },
        body,
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to reset password')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useDisableAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiClient.adminUsers.disableAdminUser({
        params: { id },
        body: {},
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to disable user')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useEnableAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiClient.adminUsers.enableAdminUser({
        params: { id },
        body: {},
      })
      if (response.status !== 200) {
        const errorBody = response.body as { message?: string }
        throw new Error(errorBody.message || 'Failed to enable user')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}
