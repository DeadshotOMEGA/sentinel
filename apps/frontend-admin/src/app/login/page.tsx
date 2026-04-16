'use client'

import { type FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircleAlert } from 'lucide-react'
import {
  DISALLOWED_MEMBER_PINS,
  type AuthMember,
  type KioskResponsibilityStateResponse,
  type LoginPinSetupReason,
  type LoginStartOfDayAction,
} from '@sentinel/contracts'
import { BadgeScanInput } from '@/components/auth/badge-scan-input'
import type { PinInputInitialSelection, PinInputSubmission } from '@/components/auth/pin-input'
import { PinInput } from '@/components/auth/pin-input'
import {
  getKioskResponsibilityPromptPresentation,
  getResponsibilityPrimaryLabel,
  type ResponsibilityActionChoice,
} from '@/components/kiosk/kiosk-responsibility-prompt.logic'
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
import { isKioskDestination, resolvePostLoginDestination } from '@/lib/post-login-destination'
import { TID } from '@/lib/test-ids'
import { useAuthStore } from '@/store/auth-store'

const LAST_REMOTE_SYSTEM_STORAGE_KEY = 'sentinel.last-remote-system'

type LoginStep = 'badge' | 'setup' | 'pin' | 'start_of_day'

interface SetupFlowState {
  member: AuthMember
  reason: LoginPinSetupReason
}

interface StartOfDayState {
  pinSubmission: PinInputSubmission
  responsibilityState: KioskResponsibilityStateResponse
}

function mapResponsibilityActionToLoginAction(
  action: ResponsibilityActionChoice
): LoginStartOfDayAction {
  return action === 'accept_dds' ? 'open_and_accept_dds' : 'open_only'
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

function getSetupDescription(reason: LoginPinSetupReason): string {
  if (reason === 'default') {
    return 'This badge is still linked to a temporary default PIN. Create a secure PIN before you can continue.'
  }

  return 'This badge does not have a PIN configured yet. Create a secure PIN before you can continue.'
}

interface StartOfDayBlocker {
  id: string
  title: string
  description: string
  tone: 'warning' | 'error'
}

function getStartOfDayBlockerAlertClass(tone: StartOfDayBlocker['tone']): string {
  if (tone === 'error') {
    return 'alert alert-soft border border-error bg-error-fadded text-error-fadded-content'
  }

  return 'alert alert-soft border border-warning bg-warning-fadded text-warning-fadded-content'
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
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center">
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
  const [startOfDayState, setStartOfDayState] = useState<StartOfDayState | null>(null)
  const [selectedStartOfDayAction, setSelectedStartOfDayAction] =
    useState<LoginStartOfDayAction | null>(null)
  const [startOfDaySubmitAttempted, setStartOfDaySubmitAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
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

  const resetPinSetupForm = () => {
    setNewPin('')
    setConfirmPin('')
  }

  const resetStartOfDayState = () => {
    setStartOfDayState(null)
    setSelectedStartOfDayAction(null)
    setStartOfDaySubmitAttempted(false)
  }

  const returnToBadgeScan = () => {
    setStep('badge')
    setBadgeSerial('')
    setSetupState(null)
    resetStartOfDayState()
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
      setError(getErrorMessage(response.body, 'Unable to verify badge access'))
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
    startOfDayAction,
  }: PinInputSubmission & { startOfDayAction?: LoginStartOfDayAction }) => {
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
          ? { serialNumber: badgeSerial, pin, useKioskRemoteSystem: true, startOfDayAction }
          : { serialNumber: badgeSerial, pin, remoteSystemId, startOfDayAction },
      })

      if (response.status === 403 && getErrorCode(response.body) === 'PIN_SETUP_REQUIRED') {
        const recovered = await runPreflight(badgeSerial)
        if (!recovered) {
          setError(getErrorMessage(response.body, 'PIN setup is required before signing in'))
        }
        return
      }

      if (response.status === 409 && response.body.error === 'START_OF_DAY_ACTION_REQUIRED') {
        const promptState = response.body.responsibilityState
        const presentation = getKioskResponsibilityPromptPresentation(promptState)
        const defaultAction = presentation.defaultAction
          ? mapResponsibilityActionToLoginAction(presentation.defaultAction)
          : null

        setStartOfDayState({
          pinSubmission: { pin, remoteSystemId, useKioskRemoteSystem },
          responsibilityState: promptState,
        })
        setSelectedStartOfDayAction(defaultAction)
        setStartOfDaySubmitAttempted(false)
        setStep('start_of_day')
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

      resetStartOfDayState()
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

  const handleStartOfDaySubmit = async () => {
    if (!startOfDayState || !selectedStartOfDayAction) {
      setStartOfDaySubmitAttempted(true)
      return
    }

    setStartOfDaySubmitAttempted(false)
    await handlePinSubmit({
      ...startOfDayState.pinSubmission,
      startOfDayAction: selectedStartOfDayAction,
    })
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

              {statusMessage && (
                <div className="alert alert-success alert-soft animate-fade-in">
                  <span>{statusMessage}</span>
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
                    onChange={(changeEvent) =>
                      setPostLoginDestination(changeEvent.target.checked ? '/kiosk' : '/dashboard')
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

              {step === 'badge' && (
                <>
                  <BadgeScanInput onScan={handleBadgeScan} showLegend={false} />
                  {loading && (
                    <div className="alert alert-info alert-soft">
                      <span className="loading loading-spinner loading-sm" />
                      <span>Checking badge access…</span>
                    </div>
                  )}
                </>
              )}

              {step === 'setup' && setupState && (
                <div className="space-y-(--space-4)">
                  <div
                    role="alert"
                    className="alert alert-warning alert-soft"
                    data-testid={TID.auth.setupNotice}
                  >
                    <span>{getSetupDescription(setupState.reason)}</span>
                  </div>

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
                    <label className="input input-lg w-full">
                      <span className="label">New PIN</span>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        className="grow text-center font-mono text-2xl tracking-[0.45em]"
                        value={newPin}
                        onChange={(changeEvent) =>
                          setNewPin(changeEvent.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        disabled={loading}
                        autoComplete="off"
                        aria-label="New PIN"
                        data-testid={TID.auth.setupPinInput}
                        required
                      />
                    </label>
                    <p className="label text-base-content/60">
                      Choose a secure 4-digit PIN that is not easy to guess.
                    </p>

                    <label className="input input-lg w-full">
                      <span className="label">Confirm New PIN</span>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        className="grow text-center font-mono text-2xl tracking-[0.45em]"
                        value={confirmPin}
                        onChange={(changeEvent) =>
                          setConfirmPin(changeEvent.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        disabled={loading}
                        autoComplete="off"
                        aria-label="Confirm new PIN"
                        data-testid={TID.auth.setupPinConfirmInput}
                        required
                      />
                    </label>

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

              {step === 'start_of_day' &&
                startOfDayState &&
                (() => {
                  const presentation = getKioskResponsibilityPromptPresentation(
                    startOfDayState.responsibilityState
                  )
                  const startOfDayBlockers: StartOfDayBlocker[] = []

                  if (presentation.blockedMessage) {
                    startOfDayBlockers.push({
                      id: 'no-open-actions',
                      title: 'No opening options available',
                      description: presentation.blockedMessage,
                      tone: 'error',
                    })
                  }

                  if (
                    startOfDaySubmitAttempted &&
                    !selectedStartOfDayAction &&
                    presentation.actionOptions.length > 0
                  ) {
                    startOfDayBlockers.push({
                      id: 'action-required',
                      title: 'No opening option selected',
                      description: 'Choose how you are opening the unit before signing in.',
                      tone: 'warning',
                    })
                  }

                  return (
                    <div className="space-y-(--space-4)" data-testid={TID.auth.startOfDayPrompt}>
                      <div className="rounded-box border border-base-300 bg-base-200/40 p-(--space-3)">
                        <div className="flex flex-wrap items-center gap-(--space-2)">
                          <AppBadge status="warning" size="sm">
                            First member today
                          </AppBadge>
                          <AppBadge status="neutral" size="sm">
                            {badgeSerial}
                          </AppBadge>
                        </div>
                        <p className="mt-(--space-3) text-sm font-medium text-base-content">
                          {startOfDayState.responsibilityState.member.rank}{' '}
                          {startOfDayState.responsibilityState.member.lastName},{' '}
                          {startOfDayState.responsibilityState.member.firstName}
                        </p>
                        <p className="mt-(--space-1) text-sm text-base-content/80">
                          {presentation.headline}
                        </p>
                        {presentation.bannerTone === 'warning' && (
                          <p className="mt-(--space-1) text-sm text-base-content/70">
                            {presentation.bannerDescription}
                          </p>
                        )}
                      </div>

                      <fieldset className="fieldset rounded-box border border-base-300 bg-base-200/70 p-(--space-4)">
                        <legend className="fieldset-legend px-(--space-2)">
                          Choose how you are opening the unit
                        </legend>
                        <p className="text-sm text-base-content/80">
                          Choose one option to continue.
                        </p>
                        <div className="space-y-(--space-3)">
                          {presentation.actionOptions.length === 0 ? (
                            <div className="rounded-box border border-base-300 bg-base-100 p-(--space-3) text-sm text-base-content/70">
                              No opening actions are available for this badge.
                            </div>
                          ) : (
                            presentation.actionOptions.map((option) => {
                              const loginAction = mapResponsibilityActionToLoginAction(option.value)
                              const checked = selectedStartOfDayAction === loginAction

                              return (
                                <label
                                  key={option.value}
                                  className={`flex cursor-pointer items-start gap-(--space-3) rounded-box border p-(--space-3) transition-colors ${
                                    checked
                                      ? 'border-primary bg-primary-fadded text-primary-fadded-content'
                                      : 'border-base-300 bg-base-100'
                                  }`}
                                  data-testid={TID.auth.startOfDayOption(option.value)}
                                >
                                  <input
                                    type="radio"
                                    name="start-of-day-action"
                                    className="radio radio-primary mt-[2px]"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedStartOfDayAction(loginAction)
                                      setStartOfDaySubmitAttempted(false)
                                    }}
                                    disabled={loading}
                                  />
                                  <div className="space-y-(--space-1)">
                                    <div className="font-semibold">{option.title}</div>
                                    <div className="text-sm opacity-80">{option.description}</div>
                                  </div>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </fieldset>

                      {startOfDayBlockers.length > 0 && (
                        <div className="space-y-(--space-2)" role="alert" aria-live="polite">
                          {startOfDayBlockers.map((blocker) => (
                            <div
                              key={blocker.id}
                              role="alert"
                              className={getStartOfDayBlockerAlertClass(blocker.tone)}
                            >
                              <CircleAlert className="h-5 w-5" />
                              <div className="space-y-(--space-1)">
                                <p className="text-sm font-semibold">{blocker.title}</p>
                                <p className="text-sm text-base-content/80">
                                  {blocker.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-(--space-2)">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            resetStartOfDayState()
                            setStep('pin')
                          }}
                          disabled={loading}
                          data-testid={TID.auth.startOfDayBack}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleStartOfDaySubmit}
                          disabled={loading || !selectedStartOfDayAction}
                          data-testid={TID.auth.startOfDaySubmit}
                        >
                          {loading ? (
                            <span className="loading loading-spinner loading-sm" />
                          ) : (
                            getResponsibilityPrimaryLabel(
                              startOfDayState.responsibilityState,
                              selectedStartOfDayAction === 'open_and_accept_dds'
                                ? 'accept_dds'
                                : 'open_building'
                            )
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })()}
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  )
}
