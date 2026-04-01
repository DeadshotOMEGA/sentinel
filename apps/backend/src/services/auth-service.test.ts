import bcrypt from 'bcryptjs'
import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionRepository } from '../repositories/session-repository.js'
import { AuthService, PinPolicyError } from './auth-service.js'

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
  }
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows login when a member has no PIN and flags PIN setup as required', async () => {
    const prisma = {
      badge: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'badge-1',
          assignedToId: 'member-1',
          status: 'active',
          members: [],
        }),
      },
      member: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Example',
          rank: 'PO2',
          serviceNumber: 'M12345678',
          accountLevel: 1,
          mustChangePin: false,
          status: 'active',
          pinHash: null,
        }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaClientInstance

    const service = new AuthService(prisma)
    const sessionRepository = createSessionRepositoryMock()
    ;(service as unknown as { sessionRepo: SessionRepository }).sessionRepo =
      sessionRepository as unknown as SessionRepository

    const result = await service.login(
      'serial-1',
      '9876',
      {
        remoteSystemId: 'remote-1',
        remoteSystemName: 'Deployment Laptop',
      },
      '127.0.0.1',
      'vitest'
    )

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { mustChangePin: true },
    })
    expect(result.member.mustChangePin).toBe(true)
    expect(sessionRepository.create).toHaveBeenCalled()
  })

  it('flags blocked member PINs for change after a successful login', async () => {
    const weakPinHash = await bcrypt.hash('1234', 12)
    const prisma = {
      badge: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'badge-1',
          assignedToId: 'member-1',
          status: 'active',
          members: [],
        }),
      },
      member: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Example',
          rank: 'PO2',
          serviceNumber: 'M12345678',
          accountLevel: 1,
          mustChangePin: false,
          status: 'active',
          pinHash: weakPinHash,
        }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaClientInstance

    const service = new AuthService(prisma)
    const sessionRepository = createSessionRepositoryMock()
    ;(service as unknown as { sessionRepo: SessionRepository }).sessionRepo =
      sessionRepository as unknown as SessionRepository

    const result = await service.login(
      'serial-1',
      '1234',
      {
        remoteSystemId: 'remote-1',
        remoteSystemName: 'Deployment Laptop',
      },
      '127.0.0.1',
      'vitest'
    )

    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { mustChangePin: true },
    })
    expect(result.member.mustChangePin).toBe(true)
  })

  it('rejects blocked replacement PINs', async () => {
    const prisma = {
      setting: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      member: {
        findUnique: vi.fn().mockResolvedValue({
          pinHash: await bcrypt.hash('2468', 12),
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
