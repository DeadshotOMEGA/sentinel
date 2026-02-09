'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
interface PinInputProps {
  onSubmit: (pin: string) => void
  onBack: () => void
}

export function PinInput({ onSubmit, onBack }: PinInputProps) {
  const [pin, setPin] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pin.length >= 4) {
      onSubmit(pin)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Enter Your PIN</legend>
        <input
          className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
          id="pin"
          type="password"
          placeholder="****"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
          autoFocus
        />
      </fieldset>
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline btn-md flex-1" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn btn-primary btn-md flex-1" disabled={pin.length < 4}>
          Sign In
        </button>
      </div>
    </form>
  )
}
