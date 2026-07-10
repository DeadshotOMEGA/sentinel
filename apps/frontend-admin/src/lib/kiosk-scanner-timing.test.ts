import { describe, expect, it } from 'vitest'
import {
  classifyScannerKeystroke,
  createEditableTargetSnapshot,
  createKioskScannerTimingSettingsFromPreset,
  createScannerClassifierState,
  getSampleRecommendation,
  insertTextIntoEditableTarget,
  maskScannerValue,
  parseKioskScannerTimingSettings,
  removeScannerPrefixFromEditableTarget,
  shouldHoldInitialScannerKeystroke,
} from './kiosk-scanner-timing'

function runKeys(keys: string[], gaps: number[]) {
  const settings = createKioskScannerTimingSettingsFromPreset('normal')
  let state = createScannerClassifierState()
  let timestamp = 1000

  for (const [index, key] of keys.entries()) {
    if (index > 0) {
      timestamp += gaps[index - 1] ?? 20
    }
    const decision = classifyScannerKeystroke(state, { key, timestamp }, settings)
    state = decision.state
    if (decision.kind === 'accepted' || decision.kind === 'rejected') {
      return decision
    }
  }

  return classifyScannerKeystroke(state, { key: 'Enter', timestamp: timestamp + 20 }, settings)
}

class FakeInputElement {
  disabled = false
  readOnly = false
  selectionStart: number | null = 0
  selectionEnd: number | null = 0
  type = 'text'
  inputEventCount = 0
  #value: string

  constructor(value: string) {
    this.#value = value
  }

  get value() {
    return this.#value
  }

  set value(value: string) {
    this.#value = value
  }

  setSelectionRange(selectionStart: number, selectionEnd: number) {
    this.selectionStart = selectionStart
    this.selectionEnd = selectionEnd
  }

  dispatchEvent(event: Event) {
    if (event.type === 'input') {
      this.inputEventCount += 1
    }
    return true
  }
}

class FakeTextAreaElement extends FakeInputElement {}

function withEditableElementGlobals(runTest: () => void) {
  const originalInputElement = globalThis.HTMLInputElement
  const originalTextAreaElement = globalThis.HTMLTextAreaElement

  Object.defineProperty(globalThis, 'HTMLInputElement', {
    configurable: true,
    value: FakeInputElement,
  })
  Object.defineProperty(globalThis, 'HTMLTextAreaElement', {
    configurable: true,
    value: FakeTextAreaElement,
  })

  try {
    runTest()
  } finally {
    Object.defineProperty(globalThis, 'HTMLInputElement', {
      configurable: true,
      value: originalInputElement,
    })
    Object.defineProperty(globalThis, 'HTMLTextAreaElement', {
      configurable: true,
      value: originalTextAreaElement,
    })
  }
}

describe('kiosk scanner timing', () => {
  it('accepts a fast keyboard-wedge burst ending in Enter', () => {
    const decision = runKeys(['1', '2', '3', '4', '5'], [18, 17, 19, 18])

    expect(decision.kind).toBe('accepted')
    if (decision.kind === 'accepted') {
      expect(decision.sample).toMatchObject({
        value: '12345',
        accepted: true,
        length: 5,
      })
      expect(decision.sample.maxGapMs).toBe(19)
    }
  })

  it('holds the first editable character until scanner timing is known', () => {
    const settings = createKioskScannerTimingSettingsFromPreset('normal')
    const firstDecision = classifyScannerKeystroke(
      createScannerClassifierState(),
      { key: '1', timestamp: 1000 },
      settings
    )

    expect(
      shouldHoldInitialScannerKeystroke(
        createScannerClassifierState(),
        { key: '1', timestamp: 1000 },
        true
      )
    ).toBe(true)
    expect(firstDecision).toMatchObject({
      kind: 'buffering',
      shouldPreventDefault: false,
    })

    const secondDecision = classifyScannerKeystroke(
      firstDecision.state,
      { key: '2', timestamp: 1018 },
      settings
    )

    expect(secondDecision).toMatchObject({
      kind: 'buffering',
      shouldPreventDefault: true,
      state: {
        capturing: true,
        buffer: {
          value: '12',
        },
      },
    })
  })

  it('replays a held editable character when input is not scanner-speed', () => {
    withEditableElementGlobals(() => {
      const input = new FakeInputElement('AB')
      input.setSelectionRange(1, 1)
      const snapshot = createEditableTargetSnapshot(input as unknown as EventTarget)

      expect(insertTextIntoEditableTarget(snapshot, '1')).toBe(true)
      expect(input.value).toBe('A1B')
      expect(input.selectionStart).toBe(2)
      expect(input.selectionEnd).toBe(2)
      expect(input.inputEventCount).toBe(1)
    })
  })

  it('removes a leaked scanner prefix from an editable target', () => {
    withEditableElementGlobals(() => {
      const input = new FakeInputElement('AB')
      input.setSelectionRange(1, 1)
      const snapshot = createEditableTargetSnapshot(input as unknown as EventTarget)
      input.value = 'A1B'
      input.setSelectionRange(2, 2)

      expect(removeScannerPrefixFromEditableTarget(snapshot, '1')).toBe(true)
      expect(input.value).toBe('AB')
      expect(input.selectionStart).toBe(1)
      expect(input.selectionEnd).toBe(1)
      expect(input.inputEventCount).toBe(1)
    })
  })

  it('rejects slow manual typing', () => {
    const decision = runKeys(['1', '2', '3', '4', '5'], [140, 130, 120, 125])

    expect(decision.kind).toBe('rejected')
    if (decision.kind === 'rejected') {
      expect(decision.sample?.accepted).toBe(false)
    }
  })

  it('requires the configured minimum length', () => {
    const decision = runKeys(['1', '2', '3'], [15, 15])

    expect(decision.kind).toBe('rejected')
    if (decision.kind === 'rejected') {
      expect(decision.sample?.rejectionReason).toContain('at least 4')
    }
  })

  it('ignores modified shortcuts', () => {
    const settings = createKioskScannerTimingSettingsFromPreset('normal')
    const decision = classifyScannerKeystroke(
      createScannerClassifierState(),
      { key: 'r', timestamp: 1000, ctrlKey: true },
      settings
    )

    expect(decision).toMatchObject({
      kind: 'idle',
      shouldPreventDefault: false,
    })
  })

  it('parses presets and clamps invalid custom values', () => {
    expect(parseKioskScannerTimingSettings({ version: 1, preset: 'forgiving' })).toMatchObject({
      preset: 'forgiving',
      maxGapMs: 160,
    })

    expect(
      parseKioskScannerTimingSettings({
        version: 1,
        preset: 'custom',
        minLength: -10,
        maxTotalMs: 99999,
        maxAverageGapMs: 1,
        maxGapMs: 99999,
      })
    ).toMatchObject({
      minLength: 2,
      maxTotalMs: 5000,
      maxAverageGapMs: 10,
      maxGapMs: 1000,
    })
  })

  it('masks scanner values for calibration display', () => {
    expect(maskScannerValue('123456789')).toBe('12•••••89')
    expect(maskScannerValue('1234')).toBe('••••')
  })

  it('suggests a bounded custom setting from samples', () => {
    const recommendation = getSampleRecommendation([
      {
        value: '123456',
        startedAt: 0,
        endedAt: 500,
        totalMs: 500,
        averageGapMs: 100,
        maxGapMs: 130,
        length: 6,
        accepted: false,
        rejectionReason: null,
      },
    ])

    expect(recommendation).toMatchObject({
      preset: 'custom',
      minLength: 6,
      maxTotalMs: 625,
      maxAverageGapMs: 135,
      maxGapMs: 176,
    })
  })
})
