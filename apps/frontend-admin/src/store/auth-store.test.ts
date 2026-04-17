import type { AuthMember, SessionMetadata } from '@sentinel/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createLocalStorageMock(storage: Map<string, string>) {
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size
    },
  }
}

describe('auth store', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.resetModules()
    vi.stubGlobal('localStorage', createLocalStorageMock(storage))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists and clears remote-system session metadata', async () => {
    const { useAuthStore } = await import('./auth-store')

    const member: AuthMember = {
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Example',
      rank: 'PO2',
      serviceNumber: 'M12345678',
      accountLevel: 5,
      mustChangePin: false,
    }
    const session: SessionMetadata = {
      sessionId: 'session-1',
      remoteSystemId: 'remote-server',
      remoteSystemName: 'Server',
      lastSeenAt: '2026-04-17T12:00:00.000Z',
      expiresAt: '2026-04-17T18:00:00.000Z',
    }

    useAuthStore.getState().setAuth(member, 'token-1', session)

    expect(useAuthStore.getState().session).toEqual(session)
    expect(storage.get('auth-storage')).toContain('"remoteSystemName":"Server"')

    useAuthStore.getState().updateSession({
      ...session,
      lastSeenAt: '2026-04-17T12:05:00.000Z',
    })

    expect(useAuthStore.getState().session?.lastSeenAt).toBe('2026-04-17T12:05:00.000Z')

    useAuthStore.getState().logout()

    expect(useAuthStore.getState()).toMatchObject({
      member: null,
      token: null,
      session: null,
      isAuthenticated: false,
    })
  })
})
