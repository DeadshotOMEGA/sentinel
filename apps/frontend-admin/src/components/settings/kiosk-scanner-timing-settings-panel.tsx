'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CheckCircle2, Gauge, RotateCcw, Save, ScanLine, TimerReset, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { KioskScannerTimingPreset } from '@sentinel/contracts'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { Chip } from '@/components/ui/chip'
import {
  createKioskScannerTimingSettingsFromPreset,
  createScannerSample,
  getDefaultKioskScannerTimingSettings,
  getSampleRecommendation,
  KIOSK_SCANNER_TIMING_LIMITS,
  KIOSK_SCANNER_TIMING_PRESETS,
  maskScannerValue,
  normalizeKioskScannerTimingSettings,
  type KioskScannerTimingSettings,
  type KioskScannerTimingValues,
} from '@/lib/kiosk-scanner-timing'
import {
  useKioskScannerTimingSettings,
  useSaveKioskScannerTimingSettings,
} from '@/hooks/use-kiosk-scanner-timing-settings'

type TimingField = keyof KioskScannerTimingValues

interface CapturedTimingSample {
  id: string
  value: string
  timestamps: number[]
  capturedAt: string
}

const FIELD_LABELS: Record<TimingField, string> = {
  minLength: 'Minimum characters',
  maxTotalMs: 'Max total time',
  maxAverageGapMs: 'Max average gap',
  maxGapMs: 'Max single gap',
}

const FIELD_UNITS: Record<TimingField, string> = {
  minLength: 'chars',
  maxTotalMs: 'ms',
  maxAverageGapMs: 'ms',
  maxGapMs: 'ms',
}

const PRESET_COPY: Record<
  KioskScannerTimingPreset,
  { title: string; description: string; tone: 'neutral' | 'primary' | 'warning' }
> = {
  conservative: {
    title: 'Conservative',
    description: 'Strict timing. Lowest chance of accepting human typing.',
    tone: 'neutral',
  },
  normal: {
    title: 'Normal',
    description: 'Balanced default for the kiosk scanner.',
    tone: 'primary',
  },
  forgiving: {
    title: 'Forgiving',
    description: 'Wider timing window for slower scanner hardware.',
    tone: 'warning',
  },
}

function cloneSettings(settings: KioskScannerTimingSettings): KioskScannerTimingSettings {
  return { ...settings }
}

function formatMs(value: number): string {
  return `${Math.round(value)} ms`
}

function getPresetButtonClass(
  preset: KioskScannerTimingPreset,
  activePreset: KioskScannerTimingSettings['preset']
): string {
  if (activePreset === preset) {
    return preset === 'forgiving'
      ? 'btn-warning'
      : preset === 'normal'
        ? 'btn-primary'
        : 'btn-neutral'
  }

  return 'btn-outline'
}

export function KioskScannerTimingSettingsPanel() {
  const { data: settings, isLoading, isError, error } = useKioskScannerTimingSettings()

  if (isLoading) {
    return (
      <AppCard>
        <AppCardContent className="py-(--space-10) text-center text-base-content/60">
          Loading kiosk scanner settings...
        </AppCardContent>
      </AppCard>
    )
  }

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Kiosk scanner timing</AppCardTitle>
          <AppCardDescription>
            {error instanceof Error ? error.message : 'Failed to load kiosk scanner settings.'}
          </AppCardDescription>
        </AppCardHeader>
      </AppCard>
    )
  }

  return (
    <KioskScannerTimingSettingsEditor
      settings={settings ?? getDefaultKioskScannerTimingSettings()}
    />
  )
}

function KioskScannerTimingSettingsEditor({ settings }: { settings: KioskScannerTimingSettings }) {
  const saveSettings = useSaveKioskScannerTimingSettings()
  const [draft, setDraft] = useState<KioskScannerTimingSettings>(() => cloneSettings(settings))
  const [samples, setSamples] = useState<CapturedTimingSample[]>([])

  const evaluatedSamples = useMemo(
    () =>
      samples.map((sample) => ({
        ...sample,
        result: createScannerSample(sample.value, sample.timestamps, draft),
      })),
    [draft, samples]
  )

  const isDirty = useMemo(
    () => JSON.stringify(normalizeKioskScannerTimingSettings(draft)) !== JSON.stringify(settings),
    [draft, settings]
  )

  const setPreset = (preset: KioskScannerTimingPreset) => {
    setDraft(createKioskScannerTimingSettingsFromPreset(preset))
  }

  const setTimingValue = (field: TimingField, value: number) => {
    setDraft((current) =>
      normalizeKioskScannerTimingSettings({
        ...current,
        [field]: value,
      })
    )
  }

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync(draft)
      toast.success('Kiosk scanner timing saved')
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : 'Failed to save kiosk scanner timing'
      )
    }
  }

  const handleReset = () => {
    setDraft(getDefaultKioskScannerTimingSettings())
  }

  const handleApplyRecommendation = () => {
    const recommendation = getSampleRecommendation(evaluatedSamples.map((sample) => sample.result))
    setDraft(recommendation)
    toast.message('Suggested timing applied to the draft settings')
  }

  return (
    <div className="grid gap-(--space-4) xl:grid-cols-[minmax(0,1fr)_24rem]">
      <AppCard>
        <AppCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-(--space-3)">
            <div>
              <AppCardTitle>Kiosk scanner timing</AppCardTitle>
              <AppCardDescription>
                Tune keyboard-wedge NFC scan detection without changing badge records.
              </AppCardDescription>
            </div>
            <AppBadge status={draft.preset === 'custom' ? 'warning' : 'success'}>
              {draft.preset === 'custom' ? 'Custom' : PRESET_COPY[draft.preset].title}
            </AppBadge>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-(--space-5)">
          <section className="space-y-(--space-3)">
            <div>
              <p className="text-sm font-semibold">Preset</p>
              <p className="mt-(--space-1) text-xs text-base-content/60">
                Start with a preset, then adjust the advanced numbers only if field samples need it.
              </p>
            </div>

            <div className="grid gap-(--space-3) lg:grid-cols-3">
              {KIOSK_SCANNER_TIMING_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`btn h-auto min-h-28 flex-col items-start justify-start gap-(--space-2) p-(--space-4) text-left ${getPresetButtonClass(
                    preset,
                    draft.preset
                  )}`}
                  onClick={() => setPreset(preset)}
                >
                  <span className="flex items-center gap-(--space-2) text-base font-semibold">
                    <Gauge className="h-4 w-4" />
                    {PRESET_COPY[preset].title}
                  </span>
                  <span className="whitespace-normal text-xs font-normal opacity-75">
                    {PRESET_COPY[preset].description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-(--space-3) rounded-box bg-base-200 p-(--space-4) lg:grid-cols-4">
            <TimingMetric label="Min" value={`${draft.minLength}`} detail="characters" />
            <TimingMetric label="Total" value={formatMs(draft.maxTotalMs)} detail="max duration" />
            <TimingMetric
              label="Average"
              value={formatMs(draft.maxAverageGapMs)}
              detail="max key gap"
            />
            <TimingMetric label="Single" value={formatMs(draft.maxGapMs)} detail="max gap" />
          </section>

          <details className="collapse collapse-arrow border border-base-300 bg-base-100">
            <summary className="collapse-title text-sm font-semibold">
              Advanced timing values
            </summary>
            <div className="collapse-content space-y-(--space-4)">
              {(Object.keys(FIELD_LABELS) as TimingField[]).map((field) => {
                const limits = KIOSK_SCANNER_TIMING_LIMITS[field]
                return (
                  <label key={field} className="grid gap-(--space-2) lg:grid-cols-[12rem_1fr_7rem]">
                    <span>
                      <span className="block text-sm font-medium">{FIELD_LABELS[field]}</span>
                      <span className="block text-xs text-base-content/55">
                        {limits.min}-{limits.max} {FIELD_UNITS[field]}
                      </span>
                    </span>
                    <input
                      type="range"
                      className="range range-primary range-sm self-center"
                      min={limits.min}
                      max={limits.max}
                      value={draft[field]}
                      onChange={(event) => setTimingValue(field, Number(event.target.value))}
                    />
                    <span className="join">
                      <input
                        type="number"
                        className="input input-sm join-item w-20 text-right"
                        min={limits.min}
                        max={limits.max}
                        value={draft[field]}
                        onChange={(event) => setTimingValue(field, Number(event.target.value))}
                      />
                      <span className="btn btn-sm join-item cursor-default px-(--space-2)">
                        {FIELD_UNITS[field]}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-(--space-3) border-t border-base-300 pt-(--space-4)">
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset defaults
            </button>
            <div className="flex flex-wrap gap-(--space-2)">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDraft(cloneSettings(settings))}
                disabled={!isDirty || saveSettings.isPending}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSave()}
                disabled={!isDirty || saveSettings.isPending}
              >
                {saveSettings.isPending ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </AppCardContent>
      </AppCard>

      <ScannerTimingTester
        settings={draft}
        samples={evaluatedSamples}
        onSamplesChange={setSamples}
        onApplyRecommendation={handleApplyRecommendation}
      />
    </div>
  )
}

function TimingMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-base-content/50">{label}</p>
      <p className="mt-(--space-1) font-mono text-xl font-semibold">{value}</p>
      <p className="text-xs text-base-content/60">{detail}</p>
    </div>
  )
}

function ScannerTimingTester({
  settings,
  samples,
  onSamplesChange,
  onApplyRecommendation,
}: {
  settings: KioskScannerTimingSettings
  samples: Array<CapturedTimingSample & { result: ReturnType<typeof createScannerSample> }>
  onSamplesChange: (samples: CapturedTimingSample[]) => void
  onApplyRecommendation: () => void
}) {
  const captureTargetRef = useRef<globalThis.HTMLDivElement | null>(null)
  const bufferRef = useRef<{ value: string; timestamps: number[] }>({ value: '', timestamps: [] })
  const [armed, setArmed] = useState(false)
  const [liveCount, setLiveCount] = useState(0)

  const armTester = () => {
    bufferRef.current = { value: '', timestamps: [] }
    setLiveCount(0)
    setArmed(true)
    window.requestAnimationFrame(() => captureTargetRef.current?.focus())
  }

  const clearSamples = () => {
    onSamplesChange([])
    bufferRef.current = { value: '', timestamps: [] }
    setLiveCount(0)
  }

  const handleKeyDown = (event: KeyboardEvent<globalThis.HTMLDivElement>) => {
    if (!armed) return

    if (event.ctrlKey || event.altKey || event.metaKey) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      bufferRef.current = { value: '', timestamps: [] }
      setLiveCount(0)
      setArmed(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const buffer = bufferRef.current
      if (buffer.value.length > 0) {
        const nextSample: CapturedTimingSample = {
          id: `${Date.now()}:${buffer.value.length}:${samples.length}`,
          value: buffer.value,
          timestamps: buffer.timestamps,
          capturedAt: new Date().toISOString(),
        }
        onSamplesChange(
          [
            nextSample,
            ...samples.map((sample) => ({
              id: sample.id,
              value: sample.value,
              timestamps: sample.timestamps,
              capturedAt: sample.capturedAt,
            })),
          ].slice(0, 8)
        )
        toast.success('Scanner timing sample captured')
      }
      bufferRef.current = { value: '', timestamps: [] }
      setLiveCount(0)
      return
    }

    if (event.key.length !== 1) {
      return
    }

    event.preventDefault()
    bufferRef.current = {
      value: `${bufferRef.current.value}${event.key}`,
      timestamps: [...bufferRef.current.timestamps, event.timeStamp],
    }
    setLiveCount(bufferRef.current.value.length)
  }

  return (
    <AppCard status="info">
      <AppCardHeader>
        <div className="flex items-start justify-between gap-(--space-3)">
          <div>
            <AppCardTitle>Timing tester</AppCardTitle>
            <AppCardDescription>
              Measure real scanner bursts without creating check-ins.
            </AppCardDescription>
          </div>
          <AppBadge status={armed ? 'success' : 'neutral'}>{armed ? 'Listening' : 'Idle'}</AppBadge>
        </div>
      </AppCardHeader>
      <AppCardContent className="space-y-(--space-4)">
        <div
          ref={captureTargetRef}
          role="textbox"
          tabIndex={0}
          aria-label="Scanner timing test capture area"
          onKeyDown={handleKeyDown}
          className={`min-h-32 rounded-box border border-dashed p-(--space-4) outline-none transition-colors duration-[var(--duration-fast)] ${
            armed
              ? 'border-info bg-info-fadded text-info-fadded-content ring-2 ring-info/30'
              : 'border-base-300 bg-base-200 text-base-content'
          }`}
        >
          <div className="flex items-center gap-(--space-3)">
            <ScanLine className="h-6 w-6" />
            <div>
              <p className="font-semibold">
                {armed ? 'Scan badges here' : 'Start the tester before scanning'}
              </p>
              <p className="text-sm opacity-75">
                {armed
                  ? `${liveCount} character${liveCount === 1 ? '' : 's'} buffered. Press Esc to stop.`
                  : 'Samples stay in this browser and do not record presence.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-(--space-2)">
          <button type="button" className="btn btn-info" onClick={armTester}>
            <TimerReset className="h-4 w-4" />
            {armed ? 'Restart sample' : 'Start timing test'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setArmed(false)}>
            Stop
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearSamples}>
            Clear samples
          </button>
        </div>

        {samples.length > 0 ? (
          <div className="space-y-(--space-3)">
            <div className="flex items-center justify-between gap-(--space-3)">
              <p className="text-sm font-semibold">Recent samples</p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onApplyRecommendation}
              >
                Apply from samples
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Badge</th>
                    <th>Result</th>
                    <th>Total</th>
                    <th>Avg gap</th>
                    <th>Max gap</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample) => (
                    <tr key={sample.id}>
                      <td className="font-mono">{maskScannerValue(sample.value)}</td>
                      <td>
                        <Chip
                          variant="faded"
                          color={sample.result.accepted ? 'success' : 'warning'}
                          size="sm"
                        >
                          {sample.result.accepted ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {sample.result.accepted ? 'Accepted' : 'Rejected'}
                        </Chip>
                      </td>
                      <td className="font-mono">{formatMs(sample.result.totalMs)}</td>
                      <td className="font-mono">{formatMs(sample.result.averageGapMs)}</td>
                      <td className="font-mono">{formatMs(sample.result.maxGapMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {samples.some((sample) => !sample.result.accepted) ? (
              <div className="alert alert-warning alert-soft text-sm">
                <span>
                  At least one sample is outside the current draft settings. Apply from samples or
                  adjust Advanced timing values.
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-box bg-base-200 p-(--space-4) text-sm text-base-content/65">
            Scan several real badges to compare total time, average key gap, and largest key gap.
          </div>
        )}

        <div className="rounded-box bg-base-200 p-(--space-3)">
          <p className="text-xs uppercase tracking-[0.16em] text-base-content/50">Current draft</p>
          <p className="mt-(--space-1) text-sm text-base-content/70">
            {settings.preset === 'custom'
              ? 'Custom timing'
              : `${PRESET_COPY[settings.preset].title} preset`}{' '}
            accepts {settings.minLength}+ characters in {settings.maxTotalMs} ms.
          </p>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
