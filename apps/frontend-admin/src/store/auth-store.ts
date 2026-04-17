import type { AuthMember, SessionMetadata } from '@sentinel/contracts'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  member: AuthMember | null
  token: string | null
  session: SessionMetadata | null
  isAuthenticated: boolean
  setAuth: (member: AuthMember, token: string, session: SessionMetadata) => void
  updateSession: (session: SessionMetadata) => void
  logout: () => void
  hasMinimumLevel: (level: number) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      member: null,
      token: null,
      session: null,
      isAuthenticated: false,
      setAuth: (member, token, session) => set({ member, token, session, isAuthenticated: true }),
      updateSession: (session) => set((state) => ({ ...state, session })),
      logout: () => set({ member: null, token: null, session: null, isAuthenticated: false }),
      hasMinimumLevel: (level: number) => {
        const { member } = get()
        return (member?.accountLevel ?? 0) >= level
      },
    }),
    { name: 'auth-storage' }
  )
)

/**
 * Account level constants for frontend permission checks
 */
export const AccountLevel = {
  BASIC: 1,
  QUARTERMASTER: 2,
  LOCKUP: 3,
  COMMAND: 4,
  ADMIN: 5,
  DEVELOPER: 6,
} as const
