'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeScanInput } from '@/components/auth/badge-scan-input'
import { PinInput } from '@/components/auth/pin-input'
import { useAuthStore } from '@/store/auth-store'

export default function LoginPage() {
  const [step, setStep] = useState<'badge' | 'pin'>('badge')
  const [badgeSerial, setBadgeSerial] = useState<string>('')
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)

  const handleBadgeScan = (serial: string) => {
    setBadgeSerial(serial)
    setStep('pin')
  }

  const handlePinSubmit = async (_pin: string) => {
    // TODO: Call backend auth endpoint with badge + PIN
    // For now, mock success
    setUser({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      badgeId: badgeSerial,
    })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="bg-base-100 p-8 rounded-lg shadow-md w-96 border">
        <h1 className="text-2xl font-bold mb-6 text-center">HMCS Chippawa - Sentinel</h1>

        {step === 'badge' ? (
          <BadgeScanInput onScan={handleBadgeScan} />
        ) : (
          <PinInput onSubmit={handlePinSubmit} onBack={() => setStep('badge')} />
        )}
      </div>
    </div>
  )
}
