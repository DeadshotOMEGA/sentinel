'use client'

/* global HTMLInputElement */

import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { CreditCard } from 'lucide-react'
import { TID } from '@/lib/test-ids'

interface BadgeScanInputProps {
  onScan: (serial: string) => void
  showLegend?: boolean
}

export function BadgeScanInput({ onScan, showLegend = true }: BadgeScanInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onScan(value.trim())
      setValue('')
    }
  }

  return (
    <fieldset className="fieldset space-y-(--space-3)">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary-fadded p-(--space-3) text-primary-fadded-content">
          <CreditCard size={36} strokeWidth={1.75} />
        </div>
      </div>
      {showLegend && (
        <legend className="fieldset-legend mx-auto text-center text-base">
          Badge Authentication
        </legend>
      )}
      <input
        ref={inputRef}
        type="text"
        className="input input-lg w-full text-center font-mono text-lg tracking-[0.18em]"
        placeholder="BADGE NUMBER"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Badge number"
        autoComplete="off"
        data-testid={TID.auth.badgeInput}
      />
      <p className="label justify-center text-base-content/60">Press Enter to continue</p>
    </fieldset>
  )
}
