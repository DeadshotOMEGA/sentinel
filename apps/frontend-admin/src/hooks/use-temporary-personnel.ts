'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { invalidateDashboardQueries } from '@/lib/dashboard-query-invalidation'
import type {
  AssignTemporaryPersonnelNfcTagInput,
  CreateTemporaryPersonnelAssignmentInput,
  CreateTemporaryPersonnelInput,
  ManualTemporaryPersonnelCheckinInput,
  TemporaryPersonnelLifecycleActionInput,
  UpdateTemporaryPersonnelAssignmentInput,
  UpdateTemporaryPersonnelInput,
} from '@sentinel/contracts'

function getApiErrorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as { message?: unknown }).message === 'string'
  ) {
    return (body as { message: string }).message
  }

  return fallback
}

function invalidateTemporaryPersonnel(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['temporary-personnel'] })
  void queryClient.invalidateQueries({ queryKey: ['badges'] })
  void queryClient.invalidateQueries({ queryKey: ['presence'] })
  void queryClient.invalidateQueries({ queryKey: ['recent-checkins'] })
  void invalidateDashboardQueries(queryClient)
}

export function useTemporaryPersonnelAssignments(includeHistory = false) {
  return useQuery({
    queryKey: ['temporary-personnel', 'assignments', { includeHistory }],
    queryFn: async () => {
      const response = await apiClient.temporaryPersonnel.getAssignments({
        query: { includeHistory: includeHistory ? 'true' : undefined },
      })

      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to load temporary personnel.'))
      }

      return response.body
    },
  })
}

export function useTemporaryPersonnelHistory(assignmentId: string | null) {
  return useQuery({
    queryKey: ['temporary-personnel', 'history', assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error('Assignment ID is required.')

      const response = await apiClient.temporaryPersonnel.getHistory({
        params: { id: assignmentId },
      })

      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to load history.'))
      }

      return response.body
    },
    enabled: Boolean(assignmentId),
  })
}

export function useCreateTemporaryPersonnelAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTemporaryPersonnelAssignmentInput) => {
      const response = await apiClient.temporaryPersonnel.createAssignment({ body: data })
      if (response.status !== 201) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to create assignment.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useUpdateTemporaryPersonnelAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateTemporaryPersonnelAssignmentInput
    }) => {
      const response = await apiClient.temporaryPersonnel.updateAssignment({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to update assignment.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useEndTemporaryPersonnelAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: TemporaryPersonnelLifecycleActionInput
    }) => {
      const response = await apiClient.temporaryPersonnel.endAssignment({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to end assignment.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useRevokeTemporaryPersonnelAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: TemporaryPersonnelLifecycleActionInput
    }) => {
      const response = await apiClient.temporaryPersonnel.revokeAssignment({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to revoke assignment.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useAddTemporaryPersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string
      data: CreateTemporaryPersonnelInput
    }) => {
      const response = await apiClient.temporaryPersonnel.addPersonnel({
        params: { id: assignmentId },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to add temporary personnel.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useUpdateTemporaryPersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemporaryPersonnelInput }) => {
      const response = await apiClient.temporaryPersonnel.updatePersonnel({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to update temporary personnel.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useEndTemporaryPersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: TemporaryPersonnelLifecycleActionInput
    }) => {
      const response = await apiClient.temporaryPersonnel.endPersonnel({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to end temporary personnel.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useRevokeTemporaryPersonnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: TemporaryPersonnelLifecycleActionInput
    }) => {
      const response = await apiClient.temporaryPersonnel.revokePersonnel({
        params: { id },
        body: data,
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to revoke temporary personnel.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useAssignTemporaryPersonnelNfcTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignTemporaryPersonnelNfcTagInput }) => {
      const response = await apiClient.temporaryPersonnel.assignNfcTag({
        params: { id },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to assign NFC tag.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useReturnTemporaryPersonnelNfcTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.temporaryPersonnel.returnNfcTag({
        params: { id },
        body: {},
      })
      if (response.status !== 200) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to return NFC tag.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}

export function useManualTemporaryPersonnelCheckin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: ManualTemporaryPersonnelCheckinInput
    }) => {
      const response = await apiClient.temporaryPersonnel.manualCheckin({
        params: { id },
        body: data,
      })
      if (response.status !== 201) {
        throw new Error(getApiErrorMessage(response.body, 'Failed to record manual check-in.'))
      }
      return response.body
    },
    onSuccess: () => invalidateTemporaryPersonnel(queryClient),
  })
}
