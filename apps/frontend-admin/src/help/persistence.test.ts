import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearProcedureProgress, loadProcedureProgress, saveProcedureProgress } from './persistence'

function createStorage() {
  const data = new Map<string, string>()

  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key)
    }),
  }
}

describe('procedure persistence', () => {
  beforeEach(() => {
    const storage = createStorage()
    vi.stubGlobal('window', { localStorage: storage })
  })

  it('saves and loads progress', () => {
    saveProcedureProgress({
      memberId: 'member-1',
      procedureId: 'dashboard.admin.orientation.v1',
      version: 1,
      route: '/dashboard',
      status: 'in_progress',
      stepIndex: 2,
    })

    const loaded = loadProcedureProgress('member-1', 'dashboard.admin.orientation.v1', 1)

    expect(loaded?.status).toBe('in_progress')
    expect(loaded?.stepIndex).toBe(2)
  })

  it('clears progress', () => {
    saveProcedureProgress({
      memberId: 'member-2',
      procedureId: 'dashboard.admin.status.v1',
      version: 1,
      route: '/dashboard',
      status: 'in_progress',
      stepIndex: 1,
    })

    clearProcedureProgress('member-2', 'dashboard.admin.status.v1', 1)

    const loaded = loadProcedureProgress('member-2', 'dashboard.admin.status.v1', 1)
    expect(loaded).toBeNull()
  })
})
