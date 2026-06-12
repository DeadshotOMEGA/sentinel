'use client'

/* global File, FileReader */

import { useMemo, useState } from 'react'
import { FileAudio, Play, RotateCcw, Save, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import type { KioskSystemSoundId } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  getDefaultKioskSoundSettings,
  KIOSK_SOUND_EVENTS,
  KIOSK_SYSTEM_SOUND_OPTIONS,
  playKioskSound,
  type CustomKioskSoundSource,
  type KioskSoundEvent,
  type KioskSoundSettings,
  type KioskSoundSource,
} from '@/lib/kiosk-sound-settings'
import { useKioskSoundSettings, useSaveKioskSoundSettings } from '@/hooks/use-kiosk-sound-settings'

const CUSTOM_SOUND_MAX_BYTES = 1024 * 1024
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg']

function cloneSettings(settings: KioskSoundSettings): KioskSoundSettings {
  return JSON.parse(JSON.stringify(settings)) as KioskSoundSettings
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function getSourceSelectValue(source: KioskSoundSource): string {
  if (source.type === 'none') {
    return 'none'
  }

  if (source.type === 'custom') {
    return 'custom'
  }

  return `system:${source.id}`
}

function getSourceLabel(source: KioskSoundSource): string {
  if (source.type === 'none') {
    return 'No sound'
  }

  if (source.type === 'custom') {
    return `${source.name} · ${formatBytes(source.size)}`
  }

  const option = KIOSK_SYSTEM_SOUND_OPTIONS.find((candidate) => candidate.id === source.id)
  return option ? `${option.theme} · ${option.label}` : source.id
}

function createCustomSoundSource(file: File, dataUrl: string): CustomKioskSoundSource {
  return {
    type: 'custom',
    name: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl,
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Selected file could not be read.'))
    })

    reader.addEventListener('error', () => reject(new Error('Selected file could not be read.')))
    reader.readAsDataURL(file)
  })
}

async function fileToCustomSoundSource(file: File): Promise<CustomKioskSoundSource> {
  if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
    throw new Error('Use an MP3, WAV, or OGG audio file.')
  }

  if (file.size > CUSTOM_SOUND_MAX_BYTES) {
    throw new Error('Use a sound file that is 1 MB or smaller.')
  }

  const dataUrl = await readFileAsDataUrl(file)
  if (!dataUrl.startsWith('data:audio/')) {
    throw new Error('The selected file was not recognized as audio.')
  }

  return createCustomSoundSource(file, dataUrl)
}

export function KioskSoundSettingsPanel() {
  const { data: settings, isLoading, isError, error } = useKioskSoundSettings()

  if (isLoading) {
    return (
      <AppCard>
        <AppCardContent className="py-(--space-10) text-center text-base-content/60">
          Loading kiosk sound settings...
        </AppCardContent>
      </AppCard>
    )
  }

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Kiosk scan sounds</AppCardTitle>
          <AppCardDescription>
            {error instanceof Error ? error.message : 'Failed to load kiosk sound settings.'}
          </AppCardDescription>
        </AppCardHeader>
      </AppCard>
    )
  }

  return <KioskSoundSettingsEditor settings={settings ?? getDefaultKioskSoundSettings()} />
}

function KioskSoundSettingsEditor({ settings }: { settings: KioskSoundSettings }) {
  const saveSettings = useSaveKioskSoundSettings()
  const [draft, setDraft] = useState<KioskSoundSettings>(() => cloneSettings(settings))
  const [customEvent, setCustomEvent] = useState<KioskSoundEvent | null>(null)

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  )

  const setEventSource = (eventId: KioskSoundEvent, source: KioskSoundSource) => {
    setDraft((current) => ({
      ...current,
      events: {
        ...current.events,
        [eventId]: source,
      },
    }))
  }

  const handleSelectSource = (eventId: KioskSoundEvent, value: string) => {
    if (value === 'none') {
      setCustomEvent(null)
      setEventSource(eventId, { type: 'none' })
      return
    }

    if (value === 'custom') {
      setCustomEvent(eventId)
      return
    }

    const systemId = value.replace(/^system:/, '') as KioskSystemSoundId
    setCustomEvent(null)
    setEventSource(eventId, { type: 'system', id: systemId })
  }

  const handleCustomFile = async (eventId: KioskSoundEvent, file: File | null) => {
    if (!file) {
      return
    }

    try {
      const source = await fileToCustomSoundSource(file)
      setEventSource(eventId, source)
      setCustomEvent(null)
      toast.success(
        `Custom sound added for ${KIOSK_SOUND_EVENTS.find((item) => item.id === eventId)?.label}`
      )
    } catch (fileError) {
      toast.error(fileError instanceof Error ? fileError.message : 'Failed to read sound file')
    }
  }

  const handleTest = async (eventId: KioskSoundEvent) => {
    try {
      const played = await playKioskSound(draft, eventId)
      if (!played) {
        toast.message('No sound selected for this event')
        return
      }
      toast.success('Sound test played')
    } catch {
      toast.error('Browser blocked playback. Click the page once and try again.')
    }
  }

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync(draft)
      toast.success('Kiosk sound settings saved')
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save sound settings')
    }
  }

  return (
    <div className="grid gap-(--space-4) xl:grid-cols-[minmax(0,1fr)_20rem]">
      <AppCard>
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
            <div>
              <AppCardTitle>Kiosk scan sounds</AppCardTitle>
              <AppCardDescription>
                Pick the audio feedback used after badge scans on the kiosk.
              </AppCardDescription>
            </div>
            <AppBadge status={draft.enabled ? 'success' : 'neutral'}>
              {draft.enabled ? 'Enabled' : 'Muted'}
            </AppBadge>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-(--space-4)">
          <div className="grid gap-(--space-3) border-b border-base-300 pb-(--space-4) lg:grid-cols-[minmax(0,1fr)_16rem]">
            <label className="flex items-center gap-(--space-3)">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={draft.enabled}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Play kiosk scan sounds</span>
                <span className="block text-xs text-base-content/60">
                  Turns all configured scan sounds on or off.
                </span>
              </span>
            </label>

            <label className="grid gap-(--space-1)">
              <span className="flex items-center justify-between gap-(--space-2) text-sm font-semibold">
                <span>Volume</span>
                <span className="font-mono text-xs text-base-content/60">
                  {formatPercent(draft.volume)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(draft.volume * 100)}
                className="range range-primary range-sm"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    volume: Number(event.target.value) / 100,
                  }))
                }
              />
            </label>
          </div>

          <div className="grid gap-(--space-3)">
            {KIOSK_SOUND_EVENTS.map((eventDefinition) => {
              const source = draft.events[eventDefinition.id]
              const showCustomInput = customEvent === eventDefinition.id || source.type === 'custom'

              return (
                <section
                  key={eventDefinition.id}
                  className="grid gap-(--space-3) border border-base-300 bg-base-200/50 p-(--space-3) lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)_auto]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{eventDefinition.label}</p>
                    <p className="mt-(--space-1) text-xs leading-snug text-base-content/60">
                      {eventDefinition.description}
                    </p>
                    <p className="mt-(--space-2) truncate text-xs text-base-content/55">
                      {getSourceLabel(source)}
                    </p>
                  </div>

                  <div className="grid gap-(--space-2)">
                    <select
                      className="select select-bordered select-sm w-full"
                      value={
                        customEvent === eventDefinition.id ? 'custom' : getSourceSelectValue(source)
                      }
                      onChange={(selectEvent) =>
                        handleSelectSource(eventDefinition.id, selectEvent.target.value)
                      }
                    >
                      <option value="none">No sound</option>
                      <option value="custom">Select custom sound file...</option>
                      {KIOSK_SYSTEM_SOUND_OPTIONS.map((option) => (
                        <option key={option.id} value={`system:${option.id}`}>
                          {option.theme} - {option.label} ({option.fileName})
                        </option>
                      ))}
                    </select>

                    {showCustomInput ? (
                      <input
                        type="file"
                        className="file-input file-input-bordered file-input-sm w-full"
                        accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
                        onChange={(fileEvent) => {
                          void handleCustomFile(
                            eventDefinition.id,
                            fileEvent.target.files?.[0] ?? null
                          )
                          fileEvent.target.value = ''
                        }}
                      />
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm self-start"
                    onClick={() => void handleTest(eventDefinition.id)}
                    disabled={!draft.enabled || source.type === 'none'}
                  >
                    <Play className="h-4 w-4" />
                    Test
                  </button>
                </section>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-(--space-2) border-t border-base-300 pt-(--space-4)">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setDraft(getDefaultKioskSoundSettings())
                setCustomEvent(null)
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Defaults
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDraft(cloneSettings(settings))
                setCustomEvent(null)
              }}
              disabled={!isDirty || saveSettings.isPending}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void handleSave()}
              disabled={!isDirty || saveSettings.isPending}
            >
              {saveSettings.isPending ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard className="self-start">
        <AppCardHeader>
          <AppCardTitle>Current setup</AppCardTitle>
          <AppCardDescription>
            Saved sounds apply to the kiosk after the next scan.
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="grid gap-(--space-3)">
          <div className="flex items-center gap-(--space-3) bg-base-200 p-(--space-3)">
            {draft.enabled ? (
              <Volume2 className="h-5 w-5 text-success" aria-hidden="true" />
            ) : (
              <VolumeX className="h-5 w-5 text-base-content/50" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {draft.enabled ? `${formatPercent(draft.volume)} volume` : 'Muted'}
              </p>
              <p className="text-xs text-base-content/60">
                {draft.enabled ? 'Kiosk scan feedback is active.' : 'No scan sounds will play.'}
              </p>
            </div>
          </div>

          <div className="grid gap-(--space-2)">
            {KIOSK_SOUND_EVENTS.map((eventDefinition) => (
              <div
                key={eventDefinition.id}
                className="grid grid-cols-[1rem_minmax(0,1fr)] gap-(--space-2) text-sm"
              >
                <FileAudio className="mt-0.5 h-4 w-4 text-base-content/50" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium">{eventDefinition.label}</p>
                  <p className="truncate text-xs text-base-content/60">
                    {getSourceLabel(draft.events[eventDefinition.id])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AppCardContent>
      </AppCard>
    </div>
  )
}
