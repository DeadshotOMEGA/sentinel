import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../websocket/broadcast.js', async () => {
  const actual = await vi.importActual<typeof import('../websocket/broadcast.js')>(
    '../websocket/broadcast.js'
  )

  return {
    ...actual,
    broadcastSecurityAlert: vi.fn(),
  }
})

import { AlertService } from './alert-service.js'
import { broadcastSecurityAlert } from '../websocket/broadcast.js'
import {
  applyOperationalTimingsRuntimeState,
  getDefaultOperationalTimingsSettings,
} from '../lib/operational-timings-runtime.js'

interface PrismaMock {
  securityAlert: {
    count: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

function createPrismaMock(): PrismaMock {
  return {
    securityAlert: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
}

describe('AlertService.createAlert rate-limit behavior', () => {
  let prismaMock: PrismaMock

  beforeEach(() => {
    prismaMock = createPrismaMock()
    vi.mocked(broadcastSecurityAlert).mockReset()
    applyOperationalTimingsRuntimeState({
      settings: getDefaultOperationalTimingsSettings(),
      source: 'default',
      updatedAt: null,
    })
  })

  it('suppresses duplicate alerts when threshold is reached in window', async () => {
    prismaMock.securityAlert.count.mockResolvedValue(1)
    prismaMock.securityAlert.findFirst.mockResolvedValue({
      id: 'alert-existing',
      alertType: 'lockup_reminder',
      severity: 'warning',
      message: 'Existing alert',
      details: null,
      status: 'active',
      createdAt: new Date('2026-03-06T12:00:00.000Z'),
      acknowledgedAt: null,
      acknowledgedBy: null,
    })

    const service = new AlertService(prismaMock as unknown as PrismaClientInstance)
    const result = await service.createAlert({
      type: 'lockup_reminder',
      severity: 'warning',
      title: 'Lockup Reminder',
      message: 'Building has not been secured',
    })

    expect(result.id).toBe('alert-existing')
    expect(prismaMock.securityAlert.create).not.toHaveBeenCalled()
    expect(vi.mocked(broadcastSecurityAlert)).not.toHaveBeenCalled()
  })

  it('creates and broadcasts a new alert when under threshold', async () => {
    prismaMock.securityAlert.count.mockResolvedValue(0)
    prismaMock.securityAlert.create.mockResolvedValue({
      id: 'alert-new',
      createdAt: new Date('2026-03-06T12:30:00.000Z'),
    })

    const service = new AlertService(prismaMock as unknown as PrismaClientInstance)
    const result = await service.createAlert({
      type: 'lockup_reminder',
      severity: 'warning',
      title: 'Lockup Reminder',
      message: 'Building has not been secured',
    })

    expect(result.id).toBe('alert-new')
    expect(prismaMock.securityAlert.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(broadcastSecurityAlert)).toHaveBeenCalledTimes(1)
  })
})
