'use client'

import { type FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DISALLOWED_MEMBER_PINS,
  type AuthMember,
  type LoginPinSetupReason,
} from '@sentinel/contracts'
import { BadgeScanInput } from '@/components/auth/badge-scan-input'
import { PinField } from '@/components/auth/pin-field'
import type { PinInputInitialSelection, PinInputSubmission } from '@/components/auth/pin-input'
import { PinInput } from '@/components/auth/pin-input'
import { getSetupDescription } from './login-flow'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { useRemoteSystems } from '@/hooks/use-remote-systems'
import { apiClient } from '@/lib/api-client'
import { TID } from '@/lib/test-ids'
import { useAuthStore } from '@/store/auth-store'

const LAST_REMOTE_SYSTEM_STORAGE_KEY = 'sentinel.last-remote-system'

type LoginStep = 'badge' | 'setup' | 'pin'

interface SetupFlowState {
  member: AuthMember
  reason: LoginPinSetupReason
}

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

function getErrorCode(body: unknown): string | null {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = body.error
    if (typeof error === 'string' && error.trim().length > 0) {
      return error
    }
  }

  return null
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen bg-base-200 px-(--space-4) py-(--space-6)">
      <div className="mx-auto flex min-h-[calc(100vh-(var(--space-6)*2))] w-full max-w-xl items-center justify-center">
        <AppCard
          variant="elevated"
          className="w-full border border-base-300 bg-base-100 shadow-[var(--shadow-2)]"
        >
          <AppCardContent className="flex justify-center px-(--space-6) py-(--space-8)">
            <span className="loading loading-spinner loading-lg" />
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}

function LoginPageContent() {
  const [step, setStep] = useState<LoginStep>('badge')
  const [badgeSerial, setBadgeSerial] = useState<string>('')
  const [setupState, setSetupState] = useState<SetupFlowState | null>(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialSelection, setInitialSelection] = useState<PinInputInitialSelection | null>(null)
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const remoteSystemsQuery = useRemoteSystems()

  useEffect(() => {
    setInitialSelection(readInitialSelection())
  }, [])

  const resetPinSetupForm = () => {
    setNewPin('')
    setConfirmPin('')
  }

  const returnToBadgeScan = () => {
    setStep('badge')
    setBadgeSerial('')
    setSetupState(null)
    setError(null)
    setStatusMessage(null)
    resetPinSetupForm()
  }

  const applyPreflightState = (
    serial: string,
    result: {
      member: AuthMember
      pinState: 'configured' | 'setup_required'
      setupReason: LoginPinSetupReason | null
    }
  ) => {
    setBadgeSerial(serial)

    if (result.pinState === 'setup_required') {
      setSetupState({
        member: result.member,
        reason: result.setupReason ?? 'missing',
      })
      resetPinSetupForm()
      setStep('setup')
      return
    }

    setSetupState(null)
    setStep('pin')
  }

  const runPreflight = async (serial: string): Promise<boolean> => {
    const response = await apiClient.auth.preflightLogin({
      body: { serialNumber: serial },
    })

    if (response.status !== 200) {
      setError(getErrorMessage(response.body, 'Unable to verify login access'))
      return false
    }

    applyPreflightState(serial, response.body)
    return true
  }

  const handleBadgeScan = async (serial: string) => {
    setLoading(true)
    setError(null)
    setStatusMessage(null)

    try {
      await runPreflight(serial)
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handlePinSubmit = async ({
    pin,
    remoteSystemId,
    useKioskRemoteSystem,
  }: PinInputSubmission) => {
    setLoading(true)
    setError(null)
    setStatusMessage(null)

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

      if (response.status === 403 && getErrorCode(response.body) === 'PIN_SETUP_REQUIRED') {
        const recovered = await runPreflight(badgeSerial)
        if (!recovered) {
          setError(getErrorMessage(response.body, 'PIN setup is required before signing in'))
        }
        return
      }

      if (response.status !== 200) {
        setError(getErrorMessage(response.body, 'Login failed'))
        return
      }

      const data = response.body
      if (!useKioskRemoteSystem && data.remoteSystemId) {
        persistSelection({ id: data.remoteSystemId })
      }

      setAuth(data.member, data.token, {
        sessionId: data.sessionId,
        remoteSystemId: data.remoteSystemId,
        remoteSystemName: data.remoteSystemName,
        lastSeenAt: data.lastSeenAt,
        expiresAt: data.expiresAt,
      })
      if (data.member.mustChangePin) {
        router.push('/change-pin-required')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleSetupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setStatusMessage(null)

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
      const response = await apiClient.auth.setupPin({
        body: {
          serialNumber: badgeSerial,
          newPin,
        },
      })

      if (response.status !== 200) {
        setError(getErrorMessage(response.body, 'Failed to save PIN'))
        return
      }

      resetPinSetupForm()
      setSetupState(null)
      setStep('pin')
      setStatusMessage('PIN saved. Enter your new PIN to sign in.')
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 px-(--space-4) py-(--space-6)">
      <div className="mx-auto flex min-h-[calc(100vh-(var(--space-6)*2))] w-full max-w-xl items-center justify-center">
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
                <AppAlert
                  tone="error"
                  className="animate-fade-in"
                  data-testid={TID.auth.errorAlert}
                >
                  {error}
                </AppAlert>
              )}

              {statusMessage && (
                <AppAlert tone="success" className="animate-fade-in">
                  {statusMessage}
                </AppAlert>
              )}

              {step === 'badge' && (
                <>
                  <BadgeScanInput onScan={handleBadgeScan} showLegend={false} />
                  {loading && (
                    <AppAlert
                      tone="info"
                      icon={
                        <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                      }
                    >
                      Checking login access...
                    </AppAlert>
                  )}
                </>
              )}

              {step === 'setup' && setupState && (
                <div className="space-y-(--space-4)">
                  <AppAlert tone="warning" data-testid={TID.auth.setupNotice}>
                    {getSetupDescription(setupState.reason)}
                  </AppAlert>

                  <div className="rounded-box border border-base-300 bg-base-200/40 p-(--space-3)">
                    <div className="flex flex-wrap items-center gap-(--space-2)">
                      <AppBadge status="warning" size="sm">
                        PIN setup required
                      </AppBadge>
                      <AppBadge status="neutral" size="sm">
                        {badgeSerial}
                      </AppBadge>
                    </div>
                    <p className="mt-(--space-3) text-sm font-medium text-base-content">
                      {setupState.member.rank} {setupState.member.lastName},{' '}
                      {setupState.member.firstName}
                    </p>
                    <p className="mt-(--space-1) font-mono text-sm text-base-content/70">
                      {setupState.member.serviceNumber}
                    </p>
                  </div>

                  <form className="space-y-(--space-3)" onSubmit={handleSetupSubmit}>
                    <PinField
                      label="New PIN"
                      value={newPin}
                      onValueChange={setNewPin}
                      size="large"
                      disabled={loading}
                      ariaLabel="New PIN"
                      className="input-lg"
                      data-testid={TID.auth.setupPinInput}
                      required
                    />
                    <p className="label text-base-content/60">
                      Choose a secure 4-digit PIN that is not easy to guess.
                    </p>

                    <PinField
                      label="Confirm New PIN"
                      value={confirmPin}
                      onValueChange={setConfirmPin}
                      size="large"
                      disabled={loading}
                      ariaLabel="Confirm new PIN"
                      className="input-lg"
                      data-testid={TID.auth.setupPinConfirmInput}
                      required
                    />

                    <div className="grid grid-cols-2 gap-(--space-2)">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={returnToBadgeScan}
                        disabled={loading}
                      >
                        Scan Another Badge
                      </button>
                      <button
                        type="submit"
                        className="btn btn-warning"
                        disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}
                        data-testid={TID.auth.setupPinSubmit}
                      >
                        {loading ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          'Save PIN'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {step === 'pin' && (
                <PinInput
                  onSubmit={handlePinSubmit}
                  onBack={returnToBadgeScan}
                  loading={loading}
                  remoteSystems={remoteSystemsQuery.data?.systems ?? []}
                  remoteSystemsLoading={remoteSystemsQuery.isLoading}
                  remoteSystemsError={
                    remoteSystemsQuery.error instanceof Error
                      ? remoteSystemsQuery.error.message
                      : null
                  }
                  initialSelection={initialSelection}
                  loginContext={remoteSystemsQuery.data?.loginContext}
                />
              )}
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}
