'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BadgeScanInput } from '@/components/auth/badge-scan-input'
import type { PinInputInitialSelection, PinInputSubmission } from '@/components/auth/pin-input'
import { PinInput } from '@/components/auth/pin-input'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { useRemoteSystems } from '@/hooks/use-remote-systems'
import { apiClient } from '@/lib/api-client'
import { isKioskDestination, resolvePostLoginDestination } from '@/lib/post-login-destination'
import { TID } from '@/lib/test-ids'
import { useAuthStore } from '@/store/auth-store'

const LAST_REMOTE_SYSTEM_STORAGE_KEY = 'sentinel.last-remote-system'

function readInitialSelection(): PinInputInitialSelection | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(LAST_REMOTE_SYSTEM_STORAGE_KEY)
    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if ('id' in parsed && typeof parsed.id === 'string' && parsed.id.length > 0) {
      return { id: parsed.id }
    }

    if (
      'kind' in parsed &&
      parsed.kind === 'managed' &&
      'id' in parsed &&
      typeof parsed.id === 'string' &&
      parsed.id.length > 0
    ) {
      return { id: parsed.id }
    }
  } catch {
    return null
  }

  return null
}

function persistSelection(selection: PinInputInitialSelection) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAST_REMOTE_SYSTEM_STORAGE_KEY, JSON.stringify(selection))
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = body.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

export default function LoginPage() {
  const [step, setStep] = useState<'badge' | 'pin'>('badge')
  const [badgeSerial, setBadgeSerial] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialSelection, setInitialSelection] = useState<PinInputInitialSelection | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)
  const remoteSystemsQuery = useRemoteSystems()
  const [postLoginDestination, setPostLoginDestination] = useState<'/dashboard' | '/kiosk'>(
    '/dashboard'
  )

  useEffect(() => {
    setInitialSelection(readInitialSelection())
  }, [])

  useEffect(() => {
    setPostLoginDestination(
      resolvePostLoginDestination(searchParams.get('destination') ?? searchParams.get('redirect'))
    )
  }, [searchParams])

  const handleBadgeScan = (serial: string) => {
    setBadgeSerial(serial)
    setError(null)
    setStep('pin')
  }

  const handlePinSubmit = async ({
    pin,
    remoteSystemId,
    useKioskRemoteSystem,
  }: PinInputSubmission) => {
    setLoading(true)
    setError(null)

    try {
      if (!useKioskRemoteSystem && !remoteSystemId) {
        setError('Choose a managed remote system before signing in')
        return
      }

      const response = await apiClient.auth.login({
        body: useKioskRemoteSystem
          ? { serialNumber: badgeSerial, pin, useKioskRemoteSystem: true }
          : { serialNumber: badgeSerial, pin, remoteSystemId },
      })

      if (response.status !== 200) {
        setError(getErrorMessage(response.body, 'Login failed'))
        return
      }

      const data = response.body
      if (!useKioskRemoteSystem && data.remoteSystemId) {
        persistSelection({ id: data.remoteSystemId })
      }

      setAuth(data.member, data.token)
      const nextDestination = postLoginDestination
      if (data.member.mustChangePin) {
        router.push(`/change-pin-required?destination=${encodeURIComponent(nextDestination)}`)
        return
      }
      router.push(nextDestination)
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 px-(--space-4) py-(--space-6)">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center">
        <AppCard
          variant="elevated"
          className="w-full border border-base-300 bg-base-100 shadow-[var(--shadow-2)]"
        >
          <AppCardHeader className="px-(--space-6) pt-(--space-6) pb-(--space-2) text-center">
            <AppCardTitle className="text-primary text-4xl font-bold tracking-tight">
              HMCS Chippawa
            </AppCardTitle>
            <AppCardDescription className="text-sm text-base-content/80 md:text-base">
              Attendance and Operations Management Platform
            </AppCardDescription>
          </AppCardHeader>

          <AppCardContent className="px-(--space-6) pt-(--space-4) pb-(--space-6)">
            <div className="space-y-(--space-5)">
              {error && (
                <div
                  className="alert alert-error alert-soft animate-fade-in"
                  data-testid={TID.auth.errorAlert}
                >
                  <span>{error}</span>
                </div>
              )}

              <fieldset className="fieldset rounded-box border border-base-300 bg-base-200/70 p-(--space-3)">
                <legend className="fieldset-legend px-(--space-2) text-xs font-semibold uppercase tracking-[0.12em] text-base-content/60">
                  After Sign In
                </legend>
                <div className="mx-auto grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center">
                  <span
                    className={`justify-self-end pr-(--space-2) text-sm font-semibold tracking-[0.08em] ${isKioskDestination(postLoginDestination) ? 'text-base-content/50' : 'text-base-content'}`}
                  >
                    DASHBOARD
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-md justify-self-center border-base-400 bg-base-100 checked:border-secondary checked:bg-secondary checked:text-secondary-content"
                    checked={isKioskDestination(postLoginDestination)}
                    onChange={(event) =>
                      setPostLoginDestination(event.target.checked ? '/kiosk' : '/dashboard')
                    }
                    aria-label="Open into kiosk after sign in"
                    data-testid={TID.auth.destinationToggle}
                  />
                  <span
                    className={`justify-self-start pl-(--space-2) text-sm font-semibold tracking-[0.08em] ${isKioskDestination(postLoginDestination) ? 'text-base-content' : 'text-base-content/50'}`}
                  >
                    KIOSK
                  </span>
                </div>
              </fieldset>

              {step === 'badge' ? (
                <BadgeScanInput onScan={handleBadgeScan} showLegend={false} />
              ) : (
                <PinInput
                  onSubmit={handlePinSubmit}
                  onBack={() => {
                    setStep('badge')
                    setError(null)
                  }}
                  loading={loading}
                  remoteSystems={remoteSystemsQuery.data ?? []}
                  remoteSystemsLoading={remoteSystemsQuery.isLoading}
                  remoteSystemsError={
                    remoteSystemsQuery.error instanceof Error
                      ? remoteSystemsQuery.error.message
                      : null
                  }
                  initialSelection={initialSelection}
                  forceKioskRemoteSystem={isKioskDestination(postLoginDestination)}
                />
              )}
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}
