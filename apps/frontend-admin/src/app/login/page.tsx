'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeScanInput } from '@/components/auth/badge-scan-input'
import { PinInput } from '@/components/auth/pin-input'
import { useAuthStore } from '@/store/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function LoginPage() {
  const [step, setStep] = useState<'badge' | 'pin'>('badge')
  const [badgeSerial, setBadgeSerial] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleBadgeScan = (serial: string) => {
    setBadgeSerial(serial)
    setError(null)
    setStep('pin')
  }

  const handlePinSubmit = async (pin: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serialNumber: badgeSerial, pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }

      setAuth(data.member, data.token)
      router.push('/dashboard')
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="bg-base-100 p-8 shadow-md w-96 border">
        <h1 className="text-2xl font-bold mb-6 text-center">HMCS Chippawa - Sentinel</h1>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {step === 'badge' ? (
          <BadgeScanInput onScan={handleBadgeScan} />
        ) : (
          <PinInput onSubmit={handlePinSubmit} onBack={() => { setStep('badge'); setError(null) }} loading={loading} />
        )}
      </div>
    </div>
  )
}
