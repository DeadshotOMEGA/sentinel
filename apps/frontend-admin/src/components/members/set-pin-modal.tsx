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

interface SetPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

export function SetPinModal({ open, onOpenChange, memberId, memberName }: SetPinModalProps) {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
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

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId, newPin }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to set PIN')
        return
      }

      toast.success(`PIN set for ${memberName}`)
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
          <DialogTitle>Set PIN</DialogTitle>
          <DialogDescription>Set a new 4-digit PIN for {memberName}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label className="label" htmlFor="set-new-pin">
              <span className="label-text">New PIN</span>
            </label>
            <input
              id="set-new-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input input-bordered font-mono text-center tracking-[0.5em]"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={loading}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="set-confirm-pin">
              <span className="label-text">Confirm PIN</span>
            </label>
            <input
              id="set-confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input input-bordered font-mono text-center tracking-[0.5em]"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={loading}
              autoComplete="off"
              required
            />
          </div>

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
              disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Set PIN'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
