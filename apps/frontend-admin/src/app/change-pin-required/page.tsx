'use client'
/* global process */

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export default function ChangePinRequiredPage() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmPin)) {
      setError('All PIN fields must be exactly 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match')
      return
    }
    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oldPin: currentPin,
          newPin,
        }),
      })

      const data = (await response.json()) as { message?: string }
      if (!response.ok) {
        setError(data.message || 'Failed to change PIN')
        return
      }

      router.replace('/dashboard')
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore logout errors and clear local auth state.
    }
    logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-(--space-4)">
      <div className="card w-full max-w-md border border-base-300 bg-base-100 shadow-(--shadow-1)">
        <div className="card-body gap-(--space-4)">
          <h1 className="card-title text-2xl">PIN Change Required</h1>
          <p className="text-sm text-base-content/80">
            Your account is using a temporary PIN. Change it now before continuing.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-(--space-3)" onSubmit={handleSubmit}>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Current PIN</legend>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input font-mono text-center tracking-[0.5em]"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={loading}
                required
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">New PIN</legend>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input font-mono text-center tracking-[0.5em]"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={loading}
                required
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Confirm New PIN</legend>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input font-mono text-center tracking-[0.5em]"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={loading}
                required
              />
            </fieldset>

            <div className="flex items-center justify-end gap-(--space-2) pt-(--space-2)">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSignOut}
                disabled={loading}
              >
                Sign Out
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  loading ||
                  currentPin.length !== 4 ||
                  newPin.length !== 4 ||
                  confirmPin.length !== 4
                }
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : 'Change PIN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
