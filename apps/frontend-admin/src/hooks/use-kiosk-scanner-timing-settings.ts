'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  getDefaultKioskScannerTimingSettings,
  KIOSK_SCANNER_TIMING_SETTING_CATEGORY,
  KIOSK_SCANNER_TIMING_SETTING_DESCRIPTION,
  KIOSK_SCANNER_TIMING_SETTING_KEY,
  normalizeKioskScannerTimingSettings,
  parseKioskScannerTimingSettings,
  type KioskScannerTimingSettings,
} from '@/lib/kiosk-scanner-timing'

const kioskScannerTimingSettingsQueryKey = ['kiosk-scanner-timing-settings'] as const

function extractErrorMessage(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string' &&
    body.message.trim().length > 0
  ) {
    return body.message
  }

  return fallback
}

async function fetchKioskScannerTimingSettings(): Promise<KioskScannerTimingSettings> {
  const response = await apiClient.settings.getSettingByKey({
    params: { key: KIOSK_SCANNER_TIMING_SETTING_KEY },
  })

  if (response.status === 404) {
    return getDefaultKioskScannerTimingSettings()
  }

  if (response.status !== 200) {
    throw new Error(
      extractErrorMessage(response.body, 'Failed to load kiosk scanner timing settings')
    )
  }

  return (
    parseKioskScannerTimingSettings(response.body.value) ?? getDefaultKioskScannerTimingSettings()
  )
}

async function upsertKioskScannerTimingSettings(
  settings: KioskScannerTimingSettings
): Promise<KioskScannerTimingSettings> {
  const normalizedSettings = normalizeKioskScannerTimingSettings(settings)
  const existing = await apiClient.settings.getSettingByKey({
    params: { key: KIOSK_SCANNER_TIMING_SETTING_KEY },
  })

  if (existing.status === 200) {
    const updated = await apiClient.settings.updateSetting({
      params: { key: KIOSK_SCANNER_TIMING_SETTING_KEY },
      body: {
        value: normalizedSettings,
        description: KIOSK_SCANNER_TIMING_SETTING_DESCRIPTION,
      },
    })

    if (updated.status !== 200) {
      throw new Error(
        extractErrorMessage(updated.body, 'Failed to save kiosk scanner timing settings')
      )
    }

    return (
      parseKioskScannerTimingSettings(updated.body.value) ?? getDefaultKioskScannerTimingSettings()
    )
  }

  if (existing.status === 404) {
    const created = await apiClient.settings.createSetting({
      body: {
        key: KIOSK_SCANNER_TIMING_SETTING_KEY,
        value: normalizedSettings,
        category: KIOSK_SCANNER_TIMING_SETTING_CATEGORY,
        description: KIOSK_SCANNER_TIMING_SETTING_DESCRIPTION,
      },
    })

    if (created.status !== 201) {
      throw new Error(
        extractErrorMessage(created.body, 'Failed to create kiosk scanner timing settings')
      )
    }

    return (
      parseKioskScannerTimingSettings(created.body.value) ?? getDefaultKioskScannerTimingSettings()
    )
  }

  throw new Error(
    extractErrorMessage(existing.body, 'Failed to resolve kiosk scanner timing settings')
  )
}

export function useKioskScannerTimingSettings() {
  return useQuery({
    queryKey: kioskScannerTimingSettingsQueryKey,
    queryFn: fetchKioskScannerTimingSettings,
  })
}

export function useSaveKioskScannerTimingSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertKioskScannerTimingSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(kioskScannerTimingSettingsQueryKey, settings)
    },
  })
}
