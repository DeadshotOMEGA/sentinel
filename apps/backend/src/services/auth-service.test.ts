import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckinRepository } from '../repositories/checkin-repository.js'
import type { AuditRepository } from '../repositories/audit-repository.js'
import type { SessionRepository } from '../repositories/session-repository.js'
import type { PresenceService } from './presence-service.js'
import { AuthService, AuthenticationError } from './auth-service.js'

function createSessionRepositoryMock() {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'session-1',
      token: 'token-1',
      expiresAt: new Date('2026-04-08T12:00:00.000Z'),
      remoteSystemId: 'remote-1',
      remoteSystemName: 'Server',
      lastSeenAt: new Date('2026-04-01T12:00:00.000Z'),
    }),
    endById: vi.fn().mockResolvedValue(1),
  }
}

function createCheckinRepositoryMock() {
  return {
    findLatestByMember: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: 'checkin-1',
      memberId: 'member-1',
      direction: 'in',
      timestamp: new Date('2026-04-01T12:05:00.000Z'),
      kioskId: 'remote-1',
      method: 'login',
    }),
  }
}

function createPresenceServiceMock() {
  return {
    broadcastStatsUpdate: vi.fn().mockResolvedValue(undefined),
  }
}

function createAuditRepositoryMock() {
  return {
    log: vi.fn().mockResolvedValue({
      id: 'audit-1',
      adminUserId: null,
      action: 'login',
      entityType: 'session',
      entityId: 'session-1',
      details: {},
      ipAddress: '127.0.0.1',
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      adminUser: null,
    }),
  }
}

function createMemberRecord(
  overrides: Partial<{
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
    accountLevel: number
    status: string
  }> = {}
) {
  return {
    id: 'member-1',
    firstName: 'Alex',
    lastName: 'Example',
    rank: 'PO2',
    serviceNumber: 'M12345678',
    accountLevel: 1,
    status: 'active',
    ...overrides,
  }
}

function createPrismaMock(memberOverrides: Parameters<typeof createMemberRecord>[0] = {}) {
  const memberRecord = createMemberRecord(memberOverrides)

  return {
    badge: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'badge-1',
        assignedToId: memberRecord.id,
        status: 'active',
        members: [],
      }),
    },
    member: {
      findUnique: vi.fn().mockResolvedValue(memberRecord),
    },
  } as unknown as PrismaClientInstance
}

function createPrismaMockForServiceNumber(
  memberOverrides: Parameters<typeof createMemberRecord>[0] = {}
) {
  const memberRecord = createMemberRecord(memberOverrides)

  return {
    badge: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    member: {
      findUnique: vi
        .fn()
        .mockImplementation(
          async ({ where }: { where: { id?: string; serviceNumber?: string } }) => {
            if (
              where.serviceNumber === memberRecord.serviceNumber ||
              where.id === memberRecord.id
            ) {
              return memberRecord
            }

            return null
          }
        ),
    },
  } as unknown as PrismaClientInstance
}

function attachSessionRepository(service: AuthService) {
  const sessionRepository = createSessionRepositoryMock()
  ;(service as unknown as { sessionRepo: SessionRepository }).sessionRepo =
    sessionRepository as unknown as SessionRepository
  return sessionRepository
}

function attachCheckinRepository(service: AuthService) {
  const checkinRepository = createCheckinRepositoryMock()
  ;(service as unknown as { checkinRepo: CheckinRepository }).checkinRepo =
    checkinRepository as unknown as CheckinRepository
  return checkinRepository
}

function attachPresenceService(service: AuthService) {
  const presenceService = createPresenceServiceMock()
  ;(service as unknown as { presenceService: PresenceService }).presenceService =
    presenceService as unknown as PresenceService
  return presenceService
}

function attachAuditRepository(service: AuthService) {
  const auditRepository = createAuditRepositoryMock()
  ;(service as unknown as { auditRepo: AuditRepository }).auditRepo =
    auditRepository as unknown as AuditRepository
  return auditRepository
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows login with an active assigned badge', async () => {
    const prisma = createPrismaMock()
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    const presenceService = attachPresenceService(service)
    const auditRepository = attachAuditRepository(service)

    await expect(
      service.login(
        'serial-1',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Server',
        },
        '127.0.0.1',
        'vitest'
      )
    ).resolves.toMatchObject({
      member: {
        id: 'member-1',
        serviceNumber: 'M12345678',
      },
    })

    expect(sessionRepository.create).toHaveBeenCalled()
    expect(checkinRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-1',
        direction: 'in',
        kioskId: 'remote-1',
        method: 'login',
      })
    )
    expect(presenceService.broadcastStatsUpdate).toHaveBeenCalled()
    expect(auditRepository.log).toHaveBeenCalled()
  })

  it('allows login with a member Service Number', async () => {
    const prisma = createPrismaMockForServiceNumber()
    const service = new AuthService(prisma)
    attachSessionRepository(service)
    attachCheckinRepository(service)
    attachPresenceService(service)
    attachAuditRepository(service)

    await expect(
      service.login(
        'M12345678',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Server',
        },
        '127.0.0.1',
        'vitest'
      )
    ).resolves.toMatchObject({
      member: {
        id: 'member-1',
        serviceNumber: 'M12345678',
      },
    })
  })

  it('rejects unknown badge or Service Number identifiers generically', async () => {
    const prisma = createPrismaMockForServiceNumber()
    const service = new AuthService(prisma)

    await expect(
      service.login(
        'UNKNOWN',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Server',
        },
        '127.0.0.1',
        'vitest'
      )
    ).rejects.toBeInstanceOf(AuthenticationError)
  })

  it('does not create a duplicate login checkin when the member is already present', async () => {
    const prisma = createPrismaMock()
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    attachPresenceService(service)
    attachAuditRepository(service)

    checkinRepository.findLatestByMember.mockResolvedValue({
      id: 'existing-checkin',
      direction: 'in',
      timestamp: new Date('2026-04-01T11:00:00.000Z'),
    })

    await service.login(
      'serial-1',
      {
        remoteSystemId: 'remote-1',
        remoteSystemName: 'Server',
      },
      '127.0.0.1',
      'vitest'
    )

    expect(sessionRepository.create).toHaveBeenCalled()
    expect(checkinRepository.create).not.toHaveBeenCalled()
  })

  it('revokes the new session when login auto checkin fails', async () => {
    const prisma = createPrismaMock()
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    attachPresenceService(service)

    checkinRepository.create.mockRejectedValue(new Error('insert failed'))

    await expect(
      service.login(
        'serial-1',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Server',
        },
        '127.0.0.1',
        'vitest'
      )
    ).rejects.toThrow('insert failed')

    expect(sessionRepository.endById).toHaveBeenCalledWith('session-1', 'auto_checkin_failed')
  })
})
