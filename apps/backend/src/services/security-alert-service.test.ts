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
import { broadcastSecurityAlertAcknowledged } from '../websocket/broadcast.js'

interface PrismaMock {
  member: {
    findUnique: ReturnType<typeof vi.fn>
  }
  securityAlert: {
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
    vi.mocked(broadcastSecurityAlertAcknowledged).mockReset()
  })

  it('broadcasts alert acknowledgement after the database update succeeds', async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: 'admin-1',
      accountLevel: 5,
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
})
