import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  accountLevel: number
  mustChangePin: boolean
}

interface AuthState {
  member: AuthMember | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (member: AuthMember, token: string) => void
  logout: () => void
  hasMinimumLevel: (level: number) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      member: null,
      token: null,
      isAuthenticated: false,
      setAuth: (member, token) => set({ member, token, isAuthenticated: true }),
      logout: () => set({ member: null, token: null, isAuthenticated: false }),
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
