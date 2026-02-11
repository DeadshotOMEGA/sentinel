'use client'

import { useRef, useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'

interface BadgeScanInputProps {
  onScan: (serial: string) => void
}

export function BadgeScanInput({ onScan }: BadgeScanInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onScan(value.trim())
      setValue('')
    }
  }

  return (
    <fieldset className="fieldset">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <CreditCard size={48} strokeWidth={1.5} className="text-primary" />
        </div>
      </div>
      <legend className="fieldset-legend text-center">
        Scan your badge or enter badge number
      </legend>
      <input
        ref={inputRef}
        type="text"
        className="input w-full text-center font-mono text-lg tracking-widest"
        placeholder="Badge number..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Badge number"
        autoComplete="off"
      />
    </fieldset>
  )
}
