'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeScanInput } from '@/components/auth/badge-scan-input'
import {
  RemoteSystemLogin,
  type RemoteSystemLoginInitialSelection,
  type RemoteSystemLoginSubmission,
} from '@/components/auth/remote-system-login'
import { AppAlert } from '@/components/ui/AppAlert'
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

type LoginStep = 'identifier' | 'workstation'

function readInitialSelection(): RemoteSystemLoginInitialSelection | null {
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

function persistSelection(selection: RemoteSystemLoginInitialSelection) {
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
  const [step, setStep] = useState<LoginStep>('identifier')
  const [loginIdentifier, setLoginIdentifier] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialSelection, setInitialSelection] =
    useState<RemoteSystemLoginInitialSelection | null>(null)
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const remoteSystemsQuery = useRemoteSystems()

  useEffect(() => {
    setInitialSelection(readInitialSelection())
  }, [])

  const returnToIdentifierEntry = () => {
    setStep('identifier')
    setLoginIdentifier('')
    setError(null)
  }

  const handleIdentifierSubmit = (identifier: string) => {
    setLoginIdentifier(identifier)
    setError(null)
    setStep('workstation')
  }

  const handleLoginSubmit = async ({
    remoteSystemId,
    useKioskRemoteSystem,
  }: RemoteSystemLoginSubmission) => {
    setLoading(true)
    setError(null)

    try {
      if (!useKioskRemoteSystem && !remoteSystemId) {
        setError('Choose a managed remote system before signing in')
        return
      }

      const response = await apiClient.auth.login({
        body: useKioskRemoteSystem
          ? { serialNumber: loginIdentifier, useKioskRemoteSystem: true }
          : { serialNumber: loginIdentifier, remoteSystemId },
      })

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
      router.push('/dashboard')
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

              {step === 'identifier' && (
                <BadgeScanInput onScan={handleIdentifierSubmit} showLegend={false} />
              )}

              {step === 'workstation' && (
                <RemoteSystemLogin
                  onSubmit={handleLoginSubmit}
                  onBack={returnToIdentifierEntry}
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
