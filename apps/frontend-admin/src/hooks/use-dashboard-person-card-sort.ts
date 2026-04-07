'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  DASHBOARD_PERSON_CARD_SORT_SETTING_CATEGORY,
  DASHBOARD_PERSON_CARD_SORT_SETTING_DESCRIPTION,
  DASHBOARD_PERSON_CARD_SORT_SETTING_KEY,
  DEFAULT_DASHBOARD_PERSON_CARD_SORT,
  parseDashboardPersonCardSort,
  type DashboardPersonCardSortConfig,
} from '@/lib/dashboard-person-card-sort'

const dashboardSortQueryKey = ['dashboard-person-card-sort'] as const

function extractErrorMessage(body: unknown, fallback: string) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string' &&
    body.message.trim().length > 0
  ) {
    return body.message
  }

  return fallback
}

async function fetchDashboardSortConfig(): Promise<DashboardPersonCardSortConfig> {
  const response = await apiClient.settings.getSettingByKey({
    params: { key: DASHBOARD_PERSON_CARD_SORT_SETTING_KEY },
  })

  if (response.status === 404) {
    return DEFAULT_DASHBOARD_PERSON_CARD_SORT
  }

  if (response.status !== 200) {
    throw new Error(
      extractErrorMessage(response.body, 'Failed to load dashboard card sort setting')
    )
  }

  return parseDashboardPersonCardSort(response.body.value) ?? DEFAULT_DASHBOARD_PERSON_CARD_SORT
}

async function upsertDashboardSortConfig(
  value: DashboardPersonCardSortConfig
): Promise<DashboardPersonCardSortConfig> {
  const existing = await apiClient.settings.getSettingByKey({
    params: { key: DASHBOARD_PERSON_CARD_SORT_SETTING_KEY },
  })

  if (existing.status === 200) {
    const updated = await apiClient.settings.updateSetting({
      params: { key: DASHBOARD_PERSON_CARD_SORT_SETTING_KEY },
      body: {
        value,
        description: DASHBOARD_PERSON_CARD_SORT_SETTING_DESCRIPTION,
      },
    })

    if (updated.status !== 200) {
      throw new Error(
        extractErrorMessage(updated.body, 'Failed to save dashboard card sort setting')
      )
    }

    return parseDashboardPersonCardSort(updated.body.value) ?? DEFAULT_DASHBOARD_PERSON_CARD_SORT
  }

  if (existing.status === 404) {
    const created = await apiClient.settings.createSetting({
      body: {
        key: DASHBOARD_PERSON_CARD_SORT_SETTING_KEY,
        value,
        category: DASHBOARD_PERSON_CARD_SORT_SETTING_CATEGORY,
        description: DASHBOARD_PERSON_CARD_SORT_SETTING_DESCRIPTION,
      },
    })

    if (created.status !== 201) {
      throw new Error(
        extractErrorMessage(created.body, 'Failed to create dashboard card sort setting')
      )
    }

    return parseDashboardPersonCardSort(created.body.value) ?? DEFAULT_DASHBOARD_PERSON_CARD_SORT
  }

  throw new Error(
    extractErrorMessage(existing.body, 'Failed to resolve dashboard card sort setting')
  )
}

export function useDashboardPersonCardSort() {
  return useQuery({
    queryKey: dashboardSortQueryKey,
    queryFn: fetchDashboardSortConfig,
  })
}

export function useSaveDashboardPersonCardSort() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertDashboardSortConfig,
    onSuccess: (value) => {
      queryClient.setQueryData(dashboardSortQueryKey, value)
    },
  })
}
