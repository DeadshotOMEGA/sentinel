import type { PrismaClient } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../websocket/broadcast.js', async () => {
  const actual = await vi.importActual<typeof import('../websocket/broadcast.js')>(
    '../websocket/broadcast.js'
  )

  return {
    ...actual,
    broadcastSecurityAlert: vi.fn(),
    broadcastSecurityAlertAcknowledged: vi.fn(),
  }
})

import { SecurityAlertService } from './security-alert-service.js'
import {
  broadcastSecurityAlert,
  broadcastSecurityAlertAcknowledged,
} from '../websocket/broadcast.js'
import { AppError } from '../middleware/error-handler.js'
import {
  applyOperationalTimingsRuntimeState,
  getDefaultOperationalTimingsSettings,
} from '../lib/operational-timings-runtime.js'

interface PrismaMock {
  member: {
    findUnique: ReturnType<typeof vi.fn>
  }
  securityAlert: {
    count: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

function createPrismaMock(): PrismaMock {
  return {
    member: {
      findUnique: vi.fn(),
    },
    securityAlert: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
}

describe('SecurityAlertService.acknowledgeAlert', () => {
  const acknowledgedAt = new Date('2026-03-03T12:10:00.000Z')
  const createdAt = new Date('2026-03-03T12:00:00.000Z')
  let prismaMock: PrismaMock

  beforeEach(() => {
    prismaMock = createPrismaMock()
    vi.mocked(broadcastSecurityAlert).mockReset()
    vi.mocked(broadcastSecurityAlertAcknowledged).mockReset()
    applyOperationalTimingsRuntimeState({
      settings: getDefaultOperationalTimingsSettings(),
      source: 'default',
      updatedAt: null,
    })
  })

  it('allows command-level members to acknowledge alerts and broadcasts afterwards', async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: 'admin-1',
      accountLevel: 4,
    })
    prismaMock.securityAlert.findUnique.mockResolvedValue({
      id: 'alert-1',
      status: 'active',
    })
    prismaMock.securityAlert.update.mockResolvedValue({
      id: 'alert-1',
      alertType: 'system',
      severity: 'warning',
      badgeSerial: null,
      memberId: null,
      kioskId: 'playwright-e2e',
      message: 'Test alert',
      details: null,
      status: 'acknowledged',
      createdAt,
      acknowledgedAt,
    })

    const service = new SecurityAlertService(prismaMock as unknown as PrismaClient)

    await service.acknowledgeAlert('alert-1', 'admin-1', 'Handled')

    expect(prismaMock.securityAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      data: {
        status: 'acknowledged',
        acknowledgedBy: 'admin-1',
        acknowledgedAt: expect.any(Date),
        acknowledgeNote: 'Handled',
      },
    })
    expect(broadcastSecurityAlertAcknowledged).toHaveBeenCalledWith({
      id: 'alert-1',
      alertType: 'system',
      severity: 'warning',
      message: 'Test alert',
      status: 'acknowledged',
      timestamp: acknowledgedAt.toISOString(),
      acknowledgedAt: acknowledgedAt.toISOString(),
      badgeSerial: null,
      kioskId: 'playwright-e2e',
    })

    const updateOrder = prismaMock.securityAlert.update.mock.invocationCallOrder[0]
    const broadcastOrder = vi.mocked(broadcastSecurityAlertAcknowledged).mock.invocationCallOrder[0]

    expect(updateOrder).toBeDefined()
    expect(broadcastOrder).toBeDefined()

    if (updateOrder !== undefined && broadcastOrder !== undefined) {
      expect(updateOrder).toBeLessThan(broadcastOrder)
    }
  })

  it('rejects members below command level', async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: 'member-1',
      accountLevel: 3,
    })

    const service = new SecurityAlertService(prismaMock as unknown as PrismaClient)

    await expect(service.acknowledgeAlert('alert-1', 'member-1', 'Handled')).rejects.toMatchObject<
      Partial<AppError>
    >({
      statusCode: 403,
      code: 'FORBIDDEN',
    })

    expect(prismaMock.securityAlert.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.securityAlert.update).not.toHaveBeenCalled()
  })
})

describe('SecurityAlertService.createAlert rate-limit behavior', () => {
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

  it('suppresses duplicate security alerts when threshold is reached', async () => {
    prismaMock.securityAlert.count.mockResolvedValue(1)
    prismaMock.securityAlert.findFirst.mockResolvedValue({
      id: 'security-existing',
      alertType: 'badge_disabled',
      severity: 'warning',
      badgeSerial: 'A123',
      memberId: null,
      kioskId: 'playwright-e2e',
      message: 'Existing security alert',
      details: null,
      status: 'active',
      createdAt: new Date('2026-03-06T12:00:00.000Z'),
    })

    const service = new SecurityAlertService(prismaMock as unknown as PrismaClient)
    const result = await service.createAlert({
      alertType: 'badge_disabled',
      severity: 'warning',
      badgeSerial: 'A123',
      kioskId: 'playwright-e2e',
      message: 'Badge is disabled',
    })

    expect(result.id).toBe('security-existing')
    expect(prismaMock.securityAlert.create).not.toHaveBeenCalled()
    expect(vi.mocked(broadcastSecurityAlert)).not.toHaveBeenCalled()
  })

  it('creates and broadcasts when duplicate threshold is not reached', async () => {
    prismaMock.securityAlert.count.mockResolvedValue(0)
    prismaMock.securityAlert.create.mockResolvedValue({
      id: 'security-new',
      alertType: 'badge_disabled',
      severity: 'warning',
      badgeSerial: 'A123',
      memberId: null,
      kioskId: 'playwright-e2e',
      message: 'Badge is disabled',
      details: null,
      status: 'active',
      createdAt: new Date('2026-03-06T12:30:00.000Z'),
    })

    const service = new SecurityAlertService(prismaMock as unknown as PrismaClient)
    const result = await service.createAlert({
      alertType: 'badge_disabled',
      severity: 'warning',
      badgeSerial: 'A123',
      kioskId: 'playwright-e2e',
      message: 'Badge is disabled',
    })

    expect(result.id).toBe('security-new')
    expect(prismaMock.securityAlert.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(broadcastSecurityAlert)).toHaveBeenCalledTimes(1)
  })
})
