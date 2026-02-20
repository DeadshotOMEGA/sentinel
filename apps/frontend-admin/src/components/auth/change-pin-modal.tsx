'use client'
/* global process */

import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

interface ChangePinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePinModal({ open, onOpenChange }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setError(null)
  }

  const handleClose = (value: boolean) => {
    if (!value) resetForm()
    onOpenChange(value)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits')
      return
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPin: currentPin, newPin }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to change PIN')
        return
      }

      toast.success('PIN changed successfully')
      handleClose(false)
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Change PIN</DialogTitle>
          <DialogDescription>
            Enter your current PIN and choose a new 4-digit PIN.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Current PIN</legend>
            <input
              id="current-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input font-mono text-center tracking-[0.5em]"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={loading}
              autoComplete="off"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">New PIN</legend>
            <input
              id="new-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input font-mono text-center tracking-[0.5em]"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={loading}
              autoComplete="off"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Confirm New PIN</legend>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input font-mono text-center tracking-[0.5em]"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={loading}
              autoComplete="off"
              required
            />
          </fieldset>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                loading || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4
              }
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Change PIN'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
