import type { PrismaClient } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../websocket/broadcast.js', async () => {
  const actual = await vi.importActual<typeof import('../websocket/broadcast.js')>(
    '../websocket/broadcast.js'
  )

  return {
    ...actual,
    broadcastLockupExecution: vi.fn(),
    broadcastLockupTransfer: vi.fn(),
    broadcastLockupStatusUpdate: vi.fn(),
  }
})

import { LockupService } from './lockup-service.js'

function createService() {
  const prisma = {
    member: {
      findUnique: vi.fn(),
    },
    responsibilityAuditLog: {
      create: vi.fn(),
    },
  }

  const service = new LockupService(prisma as unknown as PrismaClient)

  const checkinRepo = {
    getPresentMembers: vi.fn(),
    create: vi.fn(),
  }

  const visitorRepo = {
    findActive: vi.fn(),
    checkout: vi.fn(),
  }

  const lockupRepo = {
    markLockingUp: vi.fn(),
    createExecution: vi.fn(),
    markSecured: vi.fn(),
  }

  const presenceService = {
    setMemberDirection: vi.fn(),
  }

  Reflect.set(service, 'checkinRepo', checkinRepo)
  Reflect.set(service, 'visitorRepo', visitorRepo)
  Reflect.set(service, 'lockupRepo', lockupRepo)
  Reflect.set(service, 'presenceService', presenceService)

  return { service, prisma, checkinRepo, visitorRepo, lockupRepo, presenceService }
}

describe('LockupService.getPresentMembersForLockup', () => {
  it('excludes the requesting member from the lockup preview when asked', async () => {
    const { service, checkinRepo, visitorRepo } = createService()

    checkinRepo.getPresentMembers.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Pat',
        lastName: 'Holder',
        rank: 'Capt',
        division: 'HQ',
        divisionId: 'div-1',
        memberType: 'reg_force',
        mess: null,
        checkedInAt: '2026-03-26T17:00:00.000Z',
        kioskId: 'front',
      },
      {
        id: 'member-2',
        firstName: 'Alex',
        lastName: 'Other',
        rank: 'Lt',
        division: 'Ops',
        divisionId: 'div-2',
        memberType: 'reg_force',
        mess: null,
        checkedInAt: '2026-03-26T17:10:00.000Z',
        kioskId: 'front',
      },
    ])
    visitorRepo.findActive.mockResolvedValue([])

    const result = await service.getPresentMembersForLockup({ excludeMemberId: 'member-1' })

    expect(result.members.map((member) => member.id)).toEqual(['member-2'])
  })
})

describe('LockupService.executeLockup', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('records the lockup holder checkout separately from forced checkouts', async () => {
    const { service, prisma, checkinRepo, visitorRepo, lockupRepo, presenceService } =
      createService()

    vi.spyOn(service, 'getCurrentStatus').mockResolvedValue({
      id: 'status-1',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: 'member-1',
      acquiredAt: new Date('2026-03-26T08:00:00.000Z'),
      buildingStatus: 'open',
      securedAt: null,
      securedBy: null,
      isActive: true,
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
      updatedAt: new Date('2026-03-26T00:00:00.000Z'),
      currentHolder: {
        id: 'member-1',
        firstName: 'Pat',
        lastName: 'Holder',
        rank: 'Capt',
        serviceNumber: '123',
      },
      securedByMember: null,
    })

    checkinRepo.getPresentMembers.mockResolvedValue([
      {
        id: 'member-1',
        firstName: 'Pat',
        lastName: 'Holder',
        rank: 'Capt',
        division: 'HQ',
        divisionId: 'div-1',
        memberType: 'reg_force',
        mess: null,
        checkedInAt: '2026-03-26T17:00:00.000Z',
        kioskId: 'front',
      },
      {
        id: 'member-2',
        firstName: 'Alex',
        lastName: 'Other',
        rank: 'Lt',
        division: 'Ops',
        divisionId: 'div-2',
        memberType: 'reg_force',
        mess: null,
        checkedInAt: '2026-03-26T17:10:00.000Z',
        kioskId: 'front',
      },
    ])
    visitorRepo.findActive.mockResolvedValue([])

    prisma.member.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === 'member-1') {
        return {
          badgeId: 'badge-1',
          firstName: 'Pat',
          lastName: 'Holder',
          rank: 'Capt',
        }
      }

      if (where.id === 'member-2') {
        return {
          badgeId: 'badge-2',
          firstName: 'Alex',
          lastName: 'Other',
          rank: 'Lt',
        }
      }

      return null
    })

    checkinRepo.create.mockImplementation(async (input) => ({
      id: `${input.memberId}-${input.kioskId}`,
      memberId: input.memberId,
      badgeId: input.badgeId,
      direction: input.direction,
      timestamp: input.timestamp ?? new Date(),
      kioskId: input.kioskId,
      synced: input.synced,
      createdAt: input.timestamp ?? new Date(),
    }))

    lockupRepo.markLockingUp.mockResolvedValue({})
    lockupRepo.createExecution.mockResolvedValue({ id: 'execution-1' })
    lockupRepo.markSecured.mockResolvedValue({})
    prisma.responsibilityAuditLog.create.mockResolvedValue({})
    presenceService.setMemberDirection.mockResolvedValue(undefined)

    await service.executeLockup('member-1', 'End of day')

    expect(checkinRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        memberId: 'member-1',
        kioskId: 'lockup-self-checkout',
      })
    )
    expect(checkinRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        memberId: 'member-2',
        kioskId: 'lockup-force-checkout',
      })
    )

    expect(lockupRepo.createExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        membersCheckedOut: [
          { id: 'member-1', name: 'Capt Pat Holder' },
          { id: 'member-2', name: 'Lt Alex Other' },
        ],
      })
    )
  })
})
