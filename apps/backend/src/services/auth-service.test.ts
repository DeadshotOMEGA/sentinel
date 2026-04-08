import bcrypt from 'bcryptjs'
import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckinRepository } from '../repositories/checkin-repository.js'
import type { SessionRepository } from '../repositories/session-repository.js'
import type { PresenceService } from './presence-service.js'
import {
  AuthService,
  ForbiddenError,
  PinPolicyError,
  PinSetupRequiredError,
  StartOfDayActionRequiredError,
} from './auth-service.js'

const TEST_BCRYPT_COST = 4

function createSessionRepositoryMock() {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'session-1',
      token: 'token-1',
      expiresAt: new Date('2026-04-08T12:00:00.000Z'),
      remoteSystemId: 'remote-1',
      remoteSystemName: 'Deployment Laptop',
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

function createDdsServiceMock() {
  return {
    getLoginResponsibilityState: vi.fn().mockResolvedValue({
      shouldPrompt: false,
      promptVariant: 'opener_only',
      isFirstMemberCheckin: false,
      needsDds: false,
      needsBuildingOpen: false,
      buildingStatus: 'open',
      canAcceptDds: false,
      canOpenBuilding: false,
      member: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Example',
        rank: 'PO2',
      },
      expectedDds: null,
      scheduledDds: null,
      currentDds: null,
      currentLockupHolder: null,
      currentOpenContext: null,
      presentMembers: [],
      presentVisitorCount: 0,
      todayCycles: [],
    }),
    acceptDds: vi.fn().mockResolvedValue(undefined),
  }
}

function createLockupServiceMock() {
  return {
    openBuilding: vi.fn().mockResolvedValue(undefined),
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
    mustChangePin: boolean
    status: string
    pinHash: string | null
  }> = {}
) {
  return {
    id: 'member-1',
    firstName: 'Alex',
    lastName: 'Example',
    rank: 'PO2',
    serviceNumber: 'M12345678',
    accountLevel: 1,
    mustChangePin: false,
    status: 'active',
    pinHash: null,
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
      update: vi.fn().mockResolvedValue(undefined),
    },
    setting: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClientInstance & {
    member: {
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }
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

function attachDdsService(service: AuthService) {
  const ddsService = createDdsServiceMock()
  ;(service as unknown as { ddsService: ReturnType<typeof createDdsServiceMock> }).ddsService =
    ddsService
  return ddsService
}

function attachLockupService(service: AuthService) {
  const lockupService = createLockupServiceMock()
  ;(
    service as unknown as { lockupService: ReturnType<typeof createLockupServiceMock> }
  ).lockupService = lockupService
  return lockupService
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects login when a member has no PIN and flags setup as required', async () => {
    const prisma = createPrismaMock({ pinHash: null, mustChangePin: false })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    attachDdsService(service)
    attachLockupService(service)

    await expect(
      service.login(
        'serial-1',
        '9876',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Deployment Laptop',
        },
        undefined,
        '127.0.0.1',
        'vitest'
      )
    ).rejects.toBeInstanceOf(PinSetupRequiredError)

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { mustChangePin: true },
    })
    expect(sessionRepository.create).not.toHaveBeenCalled()
  })

  it('rejects login when a member still has a blocked default PIN', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('1111', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    attachDdsService(service)
    attachLockupService(service)

    await expect(
      service.login(
        'serial-1',
        '1111',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Deployment Laptop',
        },
        undefined,
        '127.0.0.1',
        'vitest'
      )
    ).rejects.toBeInstanceOf(PinSetupRequiredError)

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { mustChangePin: true },
    })
    expect(sessionRepository.create).not.toHaveBeenCalled()
  })

  it('preflight reports missing PIN setup state', async () => {
    const prisma = createPrismaMock({ pinHash: null, mustChangePin: false })
    const service = new AuthService(prisma)

    await expect(service.preflightLogin('serial-1', '127.0.0.1')).resolves.toMatchObject({
      member: {
        id: 'member-1',
        mustChangePin: true,
      },
      pinState: 'setup_required',
      setupReason: 'missing',
    })
  })

  it('preflight reports default PIN setup state', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('1111', TEST_BCRYPT_COST),
      mustChangePin: true,
    })
    const service = new AuthService(prisma)

    await expect(service.preflightLogin('serial-1', '127.0.0.1')).resolves.toMatchObject({
      member: {
        id: 'member-1',
        mustChangePin: true,
      },
      pinState: 'setup_required',
      setupReason: 'default',
    })
  })

  it('allows self-setup for a member with a temporary default PIN and clears mustChangePin', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('1111', TEST_BCRYPT_COST),
      mustChangePin: true,
    })
    const service = new AuthService(prisma)

    await service.setupPin('serial-1', '2468', '127.0.0.1')

    const finalUpdateCall = prisma.member.update.mock.calls.at(-1)?.[0]
    expect(finalUpdateCall).toMatchObject({
      where: { id: 'member-1' },
      data: { mustChangePin: false },
    })
    expect(typeof finalUpdateCall?.data.pinHash).toBe('string')
    await expect(bcrypt.compare('2468', finalUpdateCall?.data.pinHash as string)).resolves.toBe(
      true
    )
  })

  it('rejects self-setup for an account with a configured PIN', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)

    await expect(service.setupPin('serial-1', '1357', '127.0.0.1')).rejects.toBeInstanceOf(
      ForbiddenError
    )
  })

  it('still allows normal login for a configured non-default PIN', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    const presenceService = attachPresenceService(service)
    const ddsService = attachDdsService(service)
    const lockupService = attachLockupService(service)

    await expect(
      service.login(
        'serial-1',
        '2468',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Deployment Laptop',
        },
        undefined,
        '127.0.0.1',
        'vitest'
      )
    ).resolves.toMatchObject({
      member: {
        id: 'member-1',
        mustChangePin: false,
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
    expect(ddsService.acceptDds).not.toHaveBeenCalled()
    expect(lockupService.openBuilding).not.toHaveBeenCalled()
  })

  it('does not create a duplicate login checkin when the member is already present', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    attachPresenceService(service)
    attachDdsService(service)
    attachLockupService(service)

    checkinRepository.findLatestByMember.mockResolvedValue({
      id: 'existing-checkin',
      direction: 'in',
      timestamp: new Date('2026-04-01T11:00:00.000Z'),
    })

    await service.login(
      'serial-1',
      '2468',
      {
        remoteSystemId: 'remote-1',
        remoteSystemName: 'Deployment Laptop',
      },
      undefined,
      '127.0.0.1',
      'vitest'
    )

    expect(sessionRepository.create).toHaveBeenCalled()
    expect(checkinRepository.create).not.toHaveBeenCalled()
  })

  it('revokes the new session when login auto checkin fails', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    attachPresenceService(service)
    attachDdsService(service)
    attachLockupService(service)

    checkinRepository.create.mockRejectedValue(new Error('insert failed'))

    await expect(
      service.login(
        'serial-1',
        '2468',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Deployment Laptop',
        },
        undefined,
        '127.0.0.1',
        'vitest'
      )
    ).rejects.toThrow('insert failed')

    expect(sessionRepository.endById).toHaveBeenCalledWith('session-1', 'auto_checkin_failed')
  })

  it('requires a start-of-day action before the first member opens the unit', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    const ddsService = attachDdsService(service)
    attachLockupService(service)

    ddsService.getLoginResponsibilityState.mockResolvedValue({
      shouldPrompt: true,
      promptVariant: 'expected_dds',
      isFirstMemberCheckin: true,
      needsDds: true,
      needsBuildingOpen: true,
      buildingStatus: 'secured',
      canAcceptDds: true,
      canOpenBuilding: true,
      member: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Example',
        rank: 'PO2',
      },
      expectedDds: {
        member: {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Example',
          rank: 'PO2',
        },
        source: 'scheduled',
        matchesScannedMember: true,
      },
      scheduledDds: null,
      currentDds: null,
      currentLockupHolder: null,
      currentOpenContext: null,
      presentMembers: [],
      presentVisitorCount: 0,
      todayCycles: [],
    })

    await expect(
      service.login(
        'serial-1',
        '2468',
        {
          remoteSystemId: 'remote-1',
          remoteSystemName: 'Deployment Laptop',
        },
        undefined,
        '127.0.0.1',
        'vitest'
      )
    ).rejects.toBeInstanceOf(StartOfDayActionRequiredError)

    expect(sessionRepository.create).not.toHaveBeenCalled()
    expect(checkinRepository.create).not.toHaveBeenCalled()
  })

  it('opens the unit without accepting DDS when the member selects open only', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    const presenceService = attachPresenceService(service)
    const ddsService = attachDdsService(service)
    const lockupService = attachLockupService(service)

    ddsService.getLoginResponsibilityState.mockResolvedValue({
      shouldPrompt: true,
      promptVariant: 'opener_only',
      isFirstMemberCheckin: true,
      needsDds: true,
      needsBuildingOpen: true,
      buildingStatus: 'secured',
      canAcceptDds: false,
      canOpenBuilding: true,
      member: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Example',
        rank: 'PO2',
      },
      expectedDds: null,
      scheduledDds: null,
      currentDds: null,
      currentLockupHolder: null,
      currentOpenContext: null,
      presentMembers: [],
      presentVisitorCount: 0,
      todayCycles: [],
    })

    await service.login(
      'serial-1',
      '2468',
      {
        remoteSystemId: 'remote-1',
        remoteSystemName: 'Deployment Laptop',
      },
      'open_only',
      '127.0.0.1',
      'vitest'
    )

    expect(sessionRepository.create).toHaveBeenCalled()
    expect(checkinRepository.create).toHaveBeenCalled()
    expect(lockupService.openBuilding).toHaveBeenCalledWith(
      'member-1',
      'Opened during Sentinel sign-in'
    )
    expect(ddsService.acceptDds).not.toHaveBeenCalled()
    expect(presenceService.broadcastStatsUpdate).toHaveBeenCalled()
  })

  it('accepts DDS when the first member chooses the combined start-of-day action', async () => {
    const prisma = createPrismaMock({
      pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
      mustChangePin: false,
    })
    const service = new AuthService(prisma)
    const sessionRepository = attachSessionRepository(service)
    const checkinRepository = attachCheckinRepository(service)
    attachPresenceService(service)
    const ddsService = attachDdsService(service)
    const lockupService = attachLockupService(service)

    ddsService.getLoginResponsibilityState.mockResolvedValue({
      shouldPrompt: true,
      promptVariant: 'expected_dds',
      isFirstMemberCheckin: true,
      needsDds: true,
      needsBuildingOpen: true,
      buildingStatus: 'secured',
      canAcceptDds: true,
      canOpenBuilding: true,
      member: {
        id: 'member-1',
        firstName: 'Alex',
        lastName: 'Example',
        rank: 'PO2',
      },
      expectedDds: null,
      scheduledDds: null,
      currentDds: null,
      currentLockupHolder: null,
      currentOpenContext: null,
      presentMembers: [],
      presentVisitorCount: 0,
      todayCycles: [],
    })

    await service.login(
      'serial-1',
      '2468',
      {
        remoteSystemId: 'remote-1',
        remoteSystemName: 'Deployment Laptop',
      },
      'open_and_accept_dds',
      '127.0.0.1',
      'vitest'
    )

    expect(sessionRepository.create).toHaveBeenCalled()
    expect(checkinRepository.create).toHaveBeenCalled()
    expect(ddsService.acceptDds).toHaveBeenCalledWith('member-1')
    expect(lockupService.openBuilding).not.toHaveBeenCalled()
  })

  it('rejects blocked replacement PINs', async () => {
    const prisma = {
      setting: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      member: {
        findUnique: vi.fn().mockResolvedValue({
          pinHash: await bcrypt.hash('2468', TEST_BCRYPT_COST),
          mustChangePin: true,
        }),
      },
    } as unknown as PrismaClientInstance

    const service = new AuthService(prisma)

    await expect(
      service.changePin('member-1', '1234', { allowWithoutCurrentPin: true })
    ).rejects.toBeInstanceOf(PinPolicyError)
  })
})
