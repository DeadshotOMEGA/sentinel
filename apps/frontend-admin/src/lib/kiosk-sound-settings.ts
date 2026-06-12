'use client'

/* global Audio, HTMLAudioElement */

import {
  KIOSK_SOUND_SETTING_CATEGORY,
  KIOSK_SOUND_SETTING_DESCRIPTION,
  KIOSK_SOUND_SETTING_KEY,
  KIOSK_SYSTEM_SOUND_OPTIONS,
  type KioskSystemSoundId,
} from '@sentinel/contracts'

export {
  KIOSK_SOUND_SETTING_CATEGORY,
  KIOSK_SOUND_SETTING_DESCRIPTION,
  KIOSK_SOUND_SETTING_KEY,
  KIOSK_SYSTEM_SOUND_OPTIONS,
}

export type KioskSoundEvent = 'scan_in' | 'scan_out' | 'warning' | 'error'

export interface KioskSoundEventDefinition {
  id: KioskSoundEvent
  label: string
  description: string
}

export interface DisabledKioskSoundSource {
  type: 'none'
}

export interface SystemKioskSoundSource {
  type: 'system'
  id: KioskSystemSoundId
}

export interface CustomKioskSoundSource {
  type: 'custom'
  name: string
  mimeType: string
  size: number
  dataUrl: string
}

export type KioskSoundSource =
  | DisabledKioskSoundSource
  | SystemKioskSoundSource
  | CustomKioskSoundSource

export interface KioskSoundSettings {
  version: 1
  enabled: boolean
  volume: number
  events: Record<KioskSoundEvent, KioskSoundSource>
}

export const KIOSK_SOUND_EVENTS: readonly KioskSoundEventDefinition[] = [
  {
    id: 'scan_in',
    label: 'Scan in',
    description: 'Member or temporary personnel arrival confirmed.',
  },
  {
    id: 'scan_out',
    label: 'Scan out',
    description: 'Member or temporary personnel departure confirmed.',
  },
  {
    id: 'warning',
    label: 'Warning',
    description: 'Visitor badge, lockup hold, or offline queued scan.',
  },
  {
    id: 'error',
    label: 'Rejected scan',
    description: 'Badge lookup or scan was rejected.',
  },
] as const

export const DEFAULT_KIOSK_SOUND_SETTINGS: KioskSoundSettings = {
  version: 1,
  enabled: true,
  volume: 0.75,
  events: {
    scan_in: { type: 'system', id: 'yaru-device-added' },
    scan_out: { type: 'system', id: 'yaru-device-removed' },
    warning: { type: 'system', id: 'yaru-warning' },
    error: { type: 'system', id: 'yaru-error' },
  },
}

const kioskSystemSoundIds = new Set<string>(KIOSK_SYSTEM_SOUND_OPTIONS.map((option) => option.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function cloneSettings(settings: KioskSoundSettings): KioskSoundSettings {
  return JSON.parse(JSON.stringify(settings)) as KioskSoundSettings
}

function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_KIOSK_SOUND_SETTINGS.volume
  }

  return Math.min(1, Math.max(0, value))
}

function parseSoundSource(value: unknown, fallback: KioskSoundSource): KioskSoundSource {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fallback
  }

  if (value.type === 'none') {
    return { type: 'none' }
  }

  if (
    value.type === 'system' &&
    typeof value.id === 'string' &&
    kioskSystemSoundIds.has(value.id)
  ) {
    return {
      type: 'system',
      id: value.id as KioskSystemSoundId,
    }
  }

  if (
    value.type === 'custom' &&
    typeof value.name === 'string' &&
    typeof value.mimeType === 'string' &&
    typeof value.size === 'number' &&
    typeof value.dataUrl === 'string' &&
    value.dataUrl.startsWith('data:audio/')
  ) {
    return {
      type: 'custom',
      name: value.name,
      mimeType: value.mimeType,
      size: value.size,
      dataUrl: value.dataUrl,
    }
  }

  return fallback
}

export function parseKioskSoundSettings(value: unknown): KioskSoundSettings | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.events)) {
    return null
  }

  const defaults = DEFAULT_KIOSK_SOUND_SETTINGS

  return {
    version: 1,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    volume: clampVolume(value.volume),
    events: {
      scan_in: parseSoundSource(value.events.scan_in, defaults.events.scan_in),
      scan_out: parseSoundSource(value.events.scan_out, defaults.events.scan_out),
      warning: parseSoundSource(value.events.warning, defaults.events.warning),
      error: parseSoundSource(value.events.error, defaults.events.error),
    },
  }
}

export function getDefaultKioskSoundSettings(): KioskSoundSettings {
  return cloneSettings(DEFAULT_KIOSK_SOUND_SETTINGS)
}

export function getKioskSystemSoundUrl(id: KioskSystemSoundId): string {
  return `/media/kiosk-sounds/system/${encodeURIComponent(id)}`
}

export function resolveKioskSoundUrl(
  settings: KioskSoundSettings,
  event: KioskSoundEvent
): string | null {
  if (!settings.enabled) {
    return null
  }

  const source = settings.events[event]

  if (source.type === 'none') {
    return null
  }

  if (source.type === 'system') {
    return getKioskSystemSoundUrl(source.id)
  }

  return source.dataUrl
}

const kioskAudioByUrl = new Map<string, HTMLAudioElement>()

function getKioskAudio(url: string): HTMLAudioElement {
  const cachedAudio = kioskAudioByUrl.get(url)
  if (cachedAudio) {
    return cachedAudio
  }

  const audio = new Audio(url)
  audio.preload = 'auto'
  kioskAudioByUrl.set(url, audio)
  return audio
}

function getConfiguredSoundUrls(settings: KioskSoundSettings): string[] {
  return Array.from(
    new Set(
      (['scan_in', 'scan_out', 'warning', 'error'] satisfies KioskSoundEvent[])
        .map((event) => resolveKioskSoundUrl(settings, event))
        .filter((url): url is string => Boolean(url))
    )
  )
}

export function preloadKioskSounds(settings: KioskSoundSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  for (const url of getConfiguredSoundUrls(settings)) {
    getKioskAudio(url).load()
  }
}

export async function unlockKioskSoundPlayback(settings: KioskSoundSettings): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  const urls = getConfiguredSoundUrls(settings)
  if (urls.length === 0) {
    return false
  }

  const unlockAttempts = urls.map(async (url) => {
    const audio = getKioskAudio(url)
    const previousMuted = audio.muted
    const previousVolume = audio.volume

    audio.muted = true
    audio.volume = 0

    try {
      audio.currentTime = 0
      await audio.play()
      audio.pause()
      audio.currentTime = 0
      return true
    } catch {
      return false
    } finally {
      audio.muted = previousMuted
      audio.volume = previousVolume
    }
  })

  const results = await Promise.allSettled(unlockAttempts)
  return results.some((result) => result.status === 'fulfilled' && result.value)
}

export async function playKioskSound(
  settings: KioskSoundSettings,
  event: KioskSoundEvent
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  const url = resolveKioskSoundUrl(settings, event)
  if (!url) {
    return false
  }

  const audio = getKioskAudio(url)
  audio.pause()
  audio.currentTime = 0
  audio.muted = false
  audio.volume = settings.volume
  await audio.play()
  return true
}
