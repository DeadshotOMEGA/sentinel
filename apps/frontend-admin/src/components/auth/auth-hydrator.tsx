'use client'
/* global process */

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Validates the session cookie on mount and syncs the Zustand auth store.
 * If the cookie is valid but store is empty (e.g. localStorage cleared), rehydrates.
 * If the cookie is invalid/expired, clears the store so middleware handles redirect.
 */
export function AuthHydrator() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, setAuth, logout } = useAuthStore()
  const hasValidated = useRef(false)

  useEffect(() => {
    if (hasValidated.current) return
    hasValidated.current = true

    async function validateSession() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/session`, {
          credentials: 'include',
        })

        if (res.ok) {
          const data = await res.json()
          if (data.member) {
            setAuth(data.member, data.token ?? '')
            if (
              data.member.mustChangePin &&
              pathname !== '/change-pin-required' &&
              pathname !== '/login'
            ) {
              router.replace('/change-pin-required')
              return
            }
            if (!data.member.mustChangePin && pathname === '/change-pin-required') {
              router.replace('/dashboard')
              return
            }
          }
        } else if (isAuthenticated) {
          // Cookie expired but store thinks we're authenticated
          logout()
          if (pathname === '/change-pin-required') {
            router.replace('/login')
          }
        }
      } catch {
        // Network error — keep existing store state, don't force logout
      }
    }

    validateSession()
  }, [isAuthenticated, setAuth, logout, pathname, router])

  return null
}
