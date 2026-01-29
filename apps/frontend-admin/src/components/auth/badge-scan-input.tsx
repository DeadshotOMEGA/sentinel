'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface BadgeScanInputProps {
  onScan: (serial: string) => void
}

export function BadgeScanInput({ onScan }: BadgeScanInputProps) {
  const [serial, setSerial] = useState('')

  useEffect(() => {
    // Listen for badge scan via keyboard input
    // For MVP, simple input field with auto-submit on Enter
    const handleKeyDown = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key === 'Enter' && serial.length > 0) {
        onScan(serial)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [serial, onScan])

  return (
    <div className="space-y-4">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Scan Your Badge</legend>
        <Input
          id="badge"
          type="text"
          placeholder="Badge serial number"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          autoFocus
        />
        <span className="label">
          Place your badge on the reader or enter manually
        </span>
      </fieldset>
      <Button className="w-full" onClick={() => serial && onScan(serial)} disabled={!serial}>
        Continue
      </Button>
    </div>
  )
}
