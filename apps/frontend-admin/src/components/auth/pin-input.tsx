'use client'

import { useRef, useEffect, useState } from 'react'
import { KeyRound, ArrowLeft } from 'lucide-react'
import { TID } from '@/lib/test-ids'

interface PinInputProps {
  onSubmit: (pin: string) => void
  onBack: () => void
  loading?: boolean
}

export function PinInput({ onSubmit, onBack, loading = false }: PinInputProps) {
  const [pin, setPin] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    if (value.length === 4) {
      onSubmit(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pin.length === 4) {
      e.preventDefault()
      onSubmit(pin)
    }
    if (e.key === 'Escape') {
      onBack()
    }
  }

  return (
    <fieldset className="fieldset">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <KeyRound size={48} strokeWidth={1.5} className="text-primary" />
        </div>
      </div>
      <legend className="fieldset-legend text-center">
        Enter your 4-digit PIN
      </legend>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        className="input w-full text-center font-mono text-2xl tracking-[0.5em]"
        placeholder="----"
        value={pin}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={4}
        disabled={loading}
        aria-label="PIN"
        autoComplete="off"
        data-testid={TID.auth.pinInput}
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          disabled={loading}
          data-testid={TID.auth.pinBack}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {loading && <span className="loading loading-spinner loading-sm" />}
      </div>
    </fieldset>
  )
}
