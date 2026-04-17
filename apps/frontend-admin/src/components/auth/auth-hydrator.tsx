'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import {
  buildChangePinRequiredUrl,
  buildForcedReauthLoginUrl,
  buildLoginUrl,
  resolvePostLoginDestinationHint,
} from '@/lib/post-login-destination'
import { useAuthStore } from '@/store/auth-store'

/**
 * Validates the session cookie on mount and syncs the Zustand auth store.
 * If the cookie is valid but store is empty (e.g. localStorage cleared), rehydrates.
 * If the cookie is invalid/expired, clears the store so middleware handles redirect.
 */
export function AuthHydrator() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, setAuth, updateSession, logout } = useAuthStore()
  const hasValidated = useRef(false)

  const validateSession = useEffectEvent(async () => {
    try {
      const response = await apiClient.auth.getSession()

      if (response.status === 200) {
        const data = response.body
        setAuth(data.member, '', {
          sessionId: data.sessionId,
          remoteSystemId: data.remoteSystemId,
          remoteSystemName: data.remoteSystemName,
          lastSeenAt: data.lastSeenAt,
          expiresAt: data.expiresAt,
        })

        if (
          data.member.mustChangePin &&
          pathname !== '/change-pin-required' &&
          pathname !== '/login'
        ) {
          router.replace(buildChangePinRequiredUrl(pathname, window.location.search))
          return
        }

        if (!data.member.mustChangePin && pathname === '/change-pin-required') {
          router.replace(resolvePostLoginDestinationHint(pathname, window.location.search))
        }
        return
      }

      if (response.status === 401) {
        logout()
        if (pathname !== '/login') {
          router.replace(buildForcedReauthLoginUrl())
        }
        return
      }

      if (isAuthenticated) {
        logout()
        if (pathname !== '/login') {
          router.replace(buildLoginUrl(pathname, window.location.search))
        }
      }
    } catch {
      // Network errors should not immediately clear local auth state.
    }
  })

  const sendHeartbeat = useEffectEvent(async () => {
    if (!useAuthStore.getState().isAuthenticated) {
      return
    }

    try {
      const response = await apiClient.auth.heartbeat()

      if (response.status === 200) {
        updateSession(response.body)
        return
      }

      if (response.status === 401) {
        logout()
        if (pathname !== '/login') {
          router.replace(buildForcedReauthLoginUrl())
        }
      }
    } catch {
      // Best effort only. Session validation on future navigation will recover if needed.
    }
  })

  useEffect(() => {
    if (hasValidated.current) return
    hasValidated.current = true

    void validateSession()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    void sendHeartbeat()

    const intervalId = window.setInterval(() => {
      void sendHeartbeat()
    }, 30_000)

    const handleFocus = () => {
      void sendHeartbeat()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated])

  return null
}
