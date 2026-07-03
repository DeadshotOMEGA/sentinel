'use client'

/* global HTMLInputElement, HTMLTextAreaElement */

import {
  KIOSK_SCANNER_TIMING_PRESETS,
  KIOSK_SCANNER_TIMING_SETTING_CATEGORY,
  KIOSK_SCANNER_TIMING_SETTING_DESCRIPTION,
  KIOSK_SCANNER_TIMING_SETTING_KEY,
  type KioskScannerTimingPreset,
} from '@sentinel/contracts'

export {
  KIOSK_SCANNER_TIMING_PRESETS,
  KIOSK_SCANNER_TIMING_SETTING_CATEGORY,
  KIOSK_SCANNER_TIMING_SETTING_DESCRIPTION,
  KIOSK_SCANNER_TIMING_SETTING_KEY,
}

export interface KioskScannerTimingValues {
  minLength: number
  maxTotalMs: number
  maxAverageGapMs: number
  maxGapMs: number
}

export interface KioskScannerTimingSettings extends KioskScannerTimingValues {
  version: 1
  preset: KioskScannerTimingPreset | 'custom'
}

export interface ScannerKeystroke {
  key: string
  timestamp: number
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}

export interface ScannerSample {
  value: string
  startedAt: number
  endedAt: number
  totalMs: number
  averageGapMs: number
  maxGapMs: number
  length: number
  accepted: boolean
  rejectionReason: string | null
}

interface ScannerBuffer {
  value: string
  timestamps: number[]
}

export interface ScannerClassifierState {
  buffer: ScannerBuffer | null
  capturing: boolean
}

export type ScannerClassifierDecision =
  | { kind: 'idle'; state: ScannerClassifierState; shouldPreventDefault: false }
  | { kind: 'buffering'; state: ScannerClassifierState; shouldPreventDefault: boolean }
  | {
      kind: 'accepted'
      state: ScannerClassifierState
      shouldPreventDefault: true
      sample: ScannerSample
    }
  | {
      kind: 'rejected'
      state: ScannerClassifierState
      shouldPreventDefault: boolean
      sample: ScannerSample | null
    }

export const KIOSK_SCANNER_TIMING_PRESET_VALUES: Record<
  KioskScannerTimingPreset,
  KioskScannerTimingValues
> = {
  conservative: {
    minLength: 4,
    maxTotalMs: 550,
    maxAverageGapMs: 35,
    maxGapMs: 60,
  },
  normal: {
    minLength: 4,
    maxTotalMs: 750,
    maxAverageGapMs: 45,
    maxGapMs: 80,
  },
  forgiving: {
    minLength: 4,
    maxTotalMs: 1200,
    maxAverageGapMs: 90,
    maxGapMs: 160,
  },
}

export const KIOSK_SCANNER_TIMING_LIMITS: Record<
  keyof KioskScannerTimingValues,
  {
    min: number
    max: number
  }
> = {
  minLength: { min: 2, max: 32 },
  maxTotalMs: { min: 100, max: 5000 },
  maxAverageGapMs: { min: 10, max: 500 },
  maxGapMs: { min: 20, max: 1000 },
}

export const DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS: KioskScannerTimingSettings = {
  version: 1,
  preset: 'normal',
  ...KIOSK_SCANNER_TIMING_PRESET_VALUES.normal,
}

export function getDefaultKioskScannerTimingSettings(): KioskScannerTimingSettings {
  return { ...DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS }
}

export function createScannerClassifierState(): ScannerClassifierState {
  return {
    buffer: null,
    capturing: false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPreset(value: unknown): value is KioskScannerTimingPreset {
  return (
    typeof value === 'string' &&
    KIOSK_SCANNER_TIMING_PRESETS.includes(value as KioskScannerTimingPreset)
  )
}

function clampInteger(
  value: unknown,
  fallback: number,
  limits: { min: number; max: number }
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(limits.max, Math.max(limits.min, Math.round(value)))
}

export function resolvePresetFromValues(
  values: KioskScannerTimingValues
): KioskScannerTimingPreset | 'custom' {
  for (const preset of KIOSK_SCANNER_TIMING_PRESETS) {
    const presetValues = KIOSK_SCANNER_TIMING_PRESET_VALUES[preset]
    if (
      values.minLength === presetValues.minLength &&
      values.maxTotalMs === presetValues.maxTotalMs &&
      values.maxAverageGapMs === presetValues.maxAverageGapMs &&
      values.maxGapMs === presetValues.maxGapMs
    ) {
      return preset
    }
  }

  return 'custom'
}

export function normalizeKioskScannerTimingSettings(
  settings: KioskScannerTimingSettings
): KioskScannerTimingSettings {
  const values: KioskScannerTimingValues = {
    minLength: clampInteger(
      settings.minLength,
      DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.minLength,
      KIOSK_SCANNER_TIMING_LIMITS.minLength
    ),
    maxTotalMs: clampInteger(
      settings.maxTotalMs,
      DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.maxTotalMs,
      KIOSK_SCANNER_TIMING_LIMITS.maxTotalMs
    ),
    maxAverageGapMs: clampInteger(
      settings.maxAverageGapMs,
      DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.maxAverageGapMs,
      KIOSK_SCANNER_TIMING_LIMITS.maxAverageGapMs
    ),
    maxGapMs: clampInteger(
      settings.maxGapMs,
      DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.maxGapMs,
      KIOSK_SCANNER_TIMING_LIMITS.maxGapMs
    ),
  }

  return {
    version: 1,
    preset: resolvePresetFromValues(values),
    ...values,
  }
}

export function createKioskScannerTimingSettingsFromPreset(
  preset: KioskScannerTimingPreset
): KioskScannerTimingSettings {
  return {
    version: 1,
    preset,
    ...KIOSK_SCANNER_TIMING_PRESET_VALUES[preset],
  }
}

export function parseKioskScannerTimingSettings(value: unknown): KioskScannerTimingSettings | null {
  if (!isRecord(value) || value.version !== 1) {
    return null
  }

  if (isPreset(value.preset)) {
    const presetValues = KIOSK_SCANNER_TIMING_PRESET_VALUES[value.preset]
    const hasCustomValues =
      typeof value.minLength === 'number' ||
      typeof value.maxTotalMs === 'number' ||
      typeof value.maxAverageGapMs === 'number' ||
      typeof value.maxGapMs === 'number'

    if (!hasCustomValues) {
      return createKioskScannerTimingSettingsFromPreset(value.preset)
    }

    return normalizeKioskScannerTimingSettings({
      version: 1,
      preset: value.preset,
      minLength: clampInteger(
        value.minLength,
        presetValues.minLength,
        KIOSK_SCANNER_TIMING_LIMITS.minLength
      ),
      maxTotalMs: clampInteger(
        value.maxTotalMs,
        presetValues.maxTotalMs,
        KIOSK_SCANNER_TIMING_LIMITS.maxTotalMs
      ),
      maxAverageGapMs: clampInteger(
        value.maxAverageGapMs,
        presetValues.maxAverageGapMs,
        KIOSK_SCANNER_TIMING_LIMITS.maxAverageGapMs
      ),
      maxGapMs: clampInteger(
        value.maxGapMs,
        presetValues.maxGapMs,
        KIOSK_SCANNER_TIMING_LIMITS.maxGapMs
      ),
    })
  }

  if (value.preset === 'custom') {
    return normalizeKioskScannerTimingSettings({
      version: 1,
      preset: 'custom',
      minLength: clampInteger(
        value.minLength,
        DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.minLength,
        KIOSK_SCANNER_TIMING_LIMITS.minLength
      ),
      maxTotalMs: clampInteger(
        value.maxTotalMs,
        DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.maxTotalMs,
        KIOSK_SCANNER_TIMING_LIMITS.maxTotalMs
      ),
      maxAverageGapMs: clampInteger(
        value.maxAverageGapMs,
        DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.maxAverageGapMs,
        KIOSK_SCANNER_TIMING_LIMITS.maxAverageGapMs
      ),
      maxGapMs: clampInteger(
        value.maxGapMs,
        DEFAULT_KIOSK_SCANNER_TIMING_SETTINGS.maxGapMs,
        KIOSK_SCANNER_TIMING_LIMITS.maxGapMs
      ),
    })
  }

  return null
}

function isPrintableKey(key: string): boolean {
  return key.length === 1
}

export function createScannerSample(
  value: string,
  timestamps: readonly number[],
  settings: KioskScannerTimingSettings
): ScannerSample {
  const buffer: ScannerBuffer = {
    value,
    timestamps: [...timestamps],
  }
  const startedAt = buffer.timestamps[0] ?? 0
  const endedAt = buffer.timestamps[buffer.timestamps.length - 1] ?? startedAt
  const gaps = buffer.timestamps.slice(1).map((timestamp, index) => {
    const previous = buffer.timestamps[index] ?? timestamp
    return timestamp - previous
  })
  const totalMs = endedAt - startedAt
  const maxGapMs = gaps.length > 0 ? Math.max(...gaps) : 0
  const averageGapMs = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0
  const length = buffer.value.length

  let rejectionReason: string | null = null
  if (length < settings.minLength) {
    rejectionReason = `Needs at least ${settings.minLength} characters.`
  } else if (totalMs > settings.maxTotalMs) {
    rejectionReason = `Total time ${Math.round(totalMs)} ms is above ${settings.maxTotalMs} ms.`
  } else if (averageGapMs > settings.maxAverageGapMs) {
    rejectionReason = `Average gap ${Math.round(averageGapMs)} ms is above ${settings.maxAverageGapMs} ms.`
  } else if (maxGapMs > settings.maxGapMs) {
    rejectionReason = `Largest gap ${Math.round(maxGapMs)} ms is above ${settings.maxGapMs} ms.`
  }

  return {
    value: buffer.value,
    startedAt,
    endedAt,
    totalMs,
    averageGapMs,
    maxGapMs,
    length,
    accepted: rejectionReason === null,
    rejectionReason,
  }
}

function createSample(buffer: ScannerBuffer, settings: KioskScannerTimingSettings): ScannerSample {
  return createScannerSample(buffer.value, buffer.timestamps, settings)
}

function shouldIgnoreModifiedKey(keystroke: ScannerKeystroke): boolean {
  return Boolean(keystroke.ctrlKey || keystroke.altKey || keystroke.metaKey)
}

export function classifyScannerKeystroke(
  currentState: ScannerClassifierState,
  keystroke: ScannerKeystroke,
  settings: KioskScannerTimingSettings
): ScannerClassifierDecision {
  if (shouldIgnoreModifiedKey(keystroke)) {
    return {
      kind: 'idle',
      state: createScannerClassifierState(),
      shouldPreventDefault: false,
    }
  }

  if (keystroke.key === 'Escape' || keystroke.key === 'Tab') {
    return {
      kind: 'idle',
      state: createScannerClassifierState(),
      shouldPreventDefault: false,
    }
  }

  if (keystroke.key === 'Enter') {
    if (!currentState.buffer) {
      return {
        kind: 'idle',
        state: createScannerClassifierState(),
        shouldPreventDefault: false,
      }
    }

    const sample = createSample(currentState.buffer, settings)
    return sample.accepted
      ? {
          kind: 'accepted',
          state: createScannerClassifierState(),
          shouldPreventDefault: true,
          sample,
        }
      : {
          kind: 'rejected',
          state: createScannerClassifierState(),
          shouldPreventDefault: currentState.capturing,
          sample,
        }
  }

  if (!isPrintableKey(keystroke.key)) {
    return {
      kind: 'rejected',
      state: createScannerClassifierState(),
      shouldPreventDefault: currentState.capturing,
      sample: currentState.buffer ? createSample(currentState.buffer, settings) : null,
    }
  }

  if (!currentState.buffer) {
    return {
      kind: 'buffering',
      state: {
        buffer: {
          value: keystroke.key,
          timestamps: [keystroke.timestamp],
        },
        capturing: false,
      },
      shouldPreventDefault: false,
    }
  }

  const previousTimestamp =
    currentState.buffer.timestamps[currentState.buffer.timestamps.length - 1] ?? keystroke.timestamp
  const gapMs = keystroke.timestamp - previousTimestamp

  if (gapMs > settings.maxGapMs) {
    return {
      kind: 'buffering',
      state: {
        buffer: {
          value: keystroke.key,
          timestamps: [keystroke.timestamp],
        },
        capturing: false,
      },
      shouldPreventDefault: currentState.capturing,
    }
  }

  const nextBuffer = {
    value: `${currentState.buffer.value}${keystroke.key}`,
    timestamps: [...currentState.buffer.timestamps, keystroke.timestamp],
  }

  return {
    kind: 'buffering',
    state: {
      buffer: nextBuffer,
      capturing: true,
    },
    shouldPreventDefault: true,
  }
}

export function maskScannerValue(value: string): string {
  if (value.length <= 4) {
    return '•'.repeat(value.length)
  }

  const prefixLength = Math.min(2, value.length)
  const suffixLength = Math.min(2, value.length - prefixLength)
  const hiddenLength = Math.max(0, value.length - prefixLength - suffixLength)
  return `${value.slice(0, prefixLength)}${'•'.repeat(hiddenLength)}${value.slice(
    value.length - suffixLength
  )}`
}

export function getSampleRecommendation(
  samples: readonly ScannerSample[]
): KioskScannerTimingSettings {
  const acceptedSamples = samples.filter((sample) => sample.length > 0)
  if (acceptedSamples.length === 0) {
    return getDefaultKioskScannerTimingSettings()
  }

  const minLength = Math.max(
    KIOSK_SCANNER_TIMING_LIMITS.minLength.min,
    Math.min(...acceptedSamples.map((sample) => sample.length))
  )
  const maxTotalMs = Math.ceil(Math.max(...acceptedSamples.map((sample) => sample.totalMs)) * 1.25)
  const maxAverageGapMs = Math.ceil(
    Math.max(...acceptedSamples.map((sample) => sample.averageGapMs)) * 1.35
  )
  const maxGapMs = Math.ceil(Math.max(...acceptedSamples.map((sample) => sample.maxGapMs)) * 1.35)

  return normalizeKioskScannerTimingSettings({
    version: 1,
    preset: 'custom',
    minLength,
    maxTotalMs,
    maxAverageGapMs,
    maxGapMs,
  })
}

export type EditableScannerTarget = HTMLInputElement | HTMLTextAreaElement

export interface EditableTargetSnapshot {
  element: EditableScannerTarget
  value: string
  selectionStart: number
  selectionEnd: number
}

export function isEditableScannerTarget(
  target: EventTarget | null
): target is EditableScannerTarget {
  if (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) {
    const editableTypes = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url'])
    return !target.disabled && !target.readOnly && editableTypes.has(target.type)
  }

  return (
    typeof HTMLTextAreaElement !== 'undefined' &&
    target instanceof HTMLTextAreaElement &&
    !target.disabled &&
    !target.readOnly
  )
}

export function createEditableTargetSnapshot(
  target: EventTarget | null
): EditableTargetSnapshot | null {
  if (!isEditableScannerTarget(target)) {
    return null
  }

  return {
    element: target,
    value: target.value,
    selectionStart: target.selectionStart ?? target.value.length,
    selectionEnd: target.selectionEnd ?? target.value.length,
  }
}

export function removeScannerPrefixFromEditableTarget(
  snapshot: EditableTargetSnapshot | null,
  prefix: string
): boolean {
  if (!snapshot || prefix.length === 0) {
    return false
  }

  const { element, selectionStart, selectionEnd, value } = snapshot
  const expectedValue = `${value.slice(0, selectionStart)}${prefix}${value.slice(selectionEnd)}`
  if (element.value !== expectedValue) {
    return false
  }

  const nextValue = `${value.slice(0, selectionStart)}${value.slice(selectionEnd)}`
  element.value = nextValue
  element.setSelectionRange(selectionStart, selectionStart)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}
