'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  getDefaultKioskSoundSettings,
  KIOSK_SOUND_SETTING_CATEGORY,
  KIOSK_SOUND_SETTING_DESCRIPTION,
  KIOSK_SOUND_SETTING_KEY,
  parseKioskSoundSettings,
  type KioskSoundSettings,
} from '@/lib/kiosk-sound-settings'

const kioskSoundSettingsQueryKey = ['kiosk-sound-settings'] as const

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

async function fetchKioskSoundSettings(): Promise<KioskSoundSettings> {
  const response = await apiClient.settings.getSettingByKey({
    params: { key: KIOSK_SOUND_SETTING_KEY },
  })

  if (response.status === 404) {
    return getDefaultKioskSoundSettings()
  }

  if (response.status !== 200) {
    throw new Error(extractErrorMessage(response.body, 'Failed to load kiosk sound settings'))
  }

  return parseKioskSoundSettings(response.body.value) ?? getDefaultKioskSoundSettings()
}

async function upsertKioskSoundSettings(settings: KioskSoundSettings): Promise<KioskSoundSettings> {
  const existing = await apiClient.settings.getSettingByKey({
    params: { key: KIOSK_SOUND_SETTING_KEY },
  })

  if (existing.status === 200) {
    const updated = await apiClient.settings.updateSetting({
      params: { key: KIOSK_SOUND_SETTING_KEY },
      body: {
        value: settings,
        description: KIOSK_SOUND_SETTING_DESCRIPTION,
      },
    })

    if (updated.status !== 200) {
      throw new Error(extractErrorMessage(updated.body, 'Failed to save kiosk sound settings'))
    }

    return parseKioskSoundSettings(updated.body.value) ?? getDefaultKioskSoundSettings()
  }

  if (existing.status === 404) {
    const created = await apiClient.settings.createSetting({
      body: {
        key: KIOSK_SOUND_SETTING_KEY,
        value: settings,
        category: KIOSK_SOUND_SETTING_CATEGORY,
        description: KIOSK_SOUND_SETTING_DESCRIPTION,
      },
    })

    if (created.status !== 201) {
      throw new Error(extractErrorMessage(created.body, 'Failed to create kiosk sound settings'))
    }

    return parseKioskSoundSettings(created.body.value) ?? getDefaultKioskSoundSettings()
  }

  throw new Error(extractErrorMessage(existing.body, 'Failed to resolve kiosk sound settings'))
}

export function useKioskSoundSettings() {
  return useQuery({
    queryKey: kioskSoundSettingsQueryKey,
    queryFn: fetchKioskSoundSettings,
  })
}

export function useSaveKioskSoundSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertKioskSoundSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(kioskSoundSettingsQueryKey, settings)
    },
  })
}
