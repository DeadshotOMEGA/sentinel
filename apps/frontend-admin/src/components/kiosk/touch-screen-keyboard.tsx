'use client'

import { useEffect, useRef } from 'react'
import Keyboard from 'react-simple-keyboard'
import type { KeyboardLayoutObject, KeyboardReactInterface } from 'react-simple-keyboard'

export type TouchKeyboardMode = 'keyboard' | 'numpad'

interface TouchScreenKeyboardProps {
  inputName: string
  mode: TouchKeyboardMode
  value: string
  onChange: (value: string) => void
  onPrevious: () => void
  onNext: () => void
  onBack?: () => void
  onCancel?: () => void
  onContinue?: () => void
  previousLabel?: string
  nextLabel?: string
  continueLabel?: string
}

const KEYBOARD_LAYOUT: KeyboardLayoutObject = {
  default: [
    '1 2 3 4 5 6 7 8 9 0',
    'Q W E R T Y U I O P',
    'A S D F G H J K L -',
    "Z X C V B N M ' {bksp}",
    '{space} . / {prev} {next}',
    '{back} {cancel} {continue}',
  ],
}

const NUMPAD_LAYOUT: KeyboardLayoutObject = {
  default: ['1 2 3', '4 5 6', '7 8 9', '+ 0 {bksp}', '{prev} {next}', '{back} {cancel} {continue}'],
}

const KEY_DISPLAY = {
  '{bksp}': 'Backspace',
  '{prev}': 'Previous',
  '{next}': 'Next',
  '{space}': 'Space',
  '{back}': 'Back',
  '{cancel}': 'Cancel',
  '{continue}': 'Continue',
} as const

export function TouchScreenKeyboard({
  inputName,
  mode,
  value,
  onChange,
  onPrevious,
  onNext,
  onBack,
  onCancel,
  onContinue,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  continueLabel = 'Continue',
}: TouchScreenKeyboardProps) {
  const keyboardRef = useRef<KeyboardReactInterface | null>(null)

  useEffect(() => {
    keyboardRef.current?.setInput(value)
  }, [inputName, value])

  const handleKeyPress = (button: string) => {
    if (button === '{prev}') {
      onPrevious()
      return
    }

    if (button === '{next}') {
      onNext()
      return
    }

    if (button === '{back}') {
      onBack?.()
      return
    }

    if (button === '{cancel}') {
      onCancel?.()
      return
    }

    if (button === '{continue}') {
      onContinue?.()
    }
  }

  return (
    <div
      className="rounded bg-base-200"
      style={{ padding: 'var(--space-2)', boxShadow: 'var(--shadow-1)' }}
    >
      <Keyboard
        keyboardRef={(instance) => {
          keyboardRef.current = instance
        }}
        inputName={inputName}
        layout={mode === 'numpad' ? NUMPAD_LAYOUT : KEYBOARD_LAYOUT}
        layoutName="default"
        display={{
          ...KEY_DISPLAY,
          '{prev}': previousLabel,
          '{next}': nextLabel,
          '{continue}': continueLabel,
        }}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        preventMouseDownDefault
        preventMouseUpDefault
        stopMouseDownPropagation
        stopMouseUpPropagation
        clickOnMouseDown
        disableButtonHold
        disableCaretPositioning
        theme="hg-theme-default kiosk-simple-keyboard"
      />
    </div>
  )
}
