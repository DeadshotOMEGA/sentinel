'use client'
/* global process */

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DISALLOWED_MEMBER_PINS } from '@sentinel/contracts'
import { resolvePostLoginDestination } from '@/lib/post-login-destination'
import { useAuthStore } from '@/store/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export default function ChangePinRequiredPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout } = useAuthStore()
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const destination = resolvePostLoginDestination(searchParams.get('destination'))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmPin)) {
      setError('Both PIN fields must be exactly 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match')
      return
    }
    if (DISALLOWED_MEMBER_PINS.includes(newPin as (typeof DISALLOWED_MEMBER_PINS)[number])) {
      setError('Choose a less predictable PIN')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPin }),
      })

      const data = (await response.json()) as { message?: string }
      if (!response.ok) {
        setError(data.message || 'Failed to change PIN')
        return
      }

      router.replace(destination)
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
    router.replace(`/login?destination=${encodeURIComponent(destination)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-(--space-4)">
      <div className="card w-full max-w-md border border-base-300 bg-base-100 shadow-(--shadow-1)">
        <div className="card-body gap-(--space-4)">
          <h1 className="card-title text-2xl">Create a New PIN</h1>
          <p className="text-sm text-base-content/80">
            Your account needs a secure 4-digit PIN before you can continue. Avoid simple choices
            like 1234, 0000, or 4321.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-(--space-3)" onSubmit={handleSubmit}>
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
                disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : 'Save PIN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
