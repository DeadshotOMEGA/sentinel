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
      findMany: vi.fn(),
    },
    ddsAssignment: {
      findFirst: vi.fn(),
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
    createStatus: vi.fn(),
    markLockingUp: vi.fn(),
    createExecution: vi.fn(),
    markSecured: vi.fn(),
    updateHolder: vi.fn(),
    markOpen: vi.fn(),
  }

  const presenceService = {
    setMemberDirection: vi.fn(),
    isMemberPresent: vi.fn(),
  }

  const qualificationService = {
    canMemberReceiveLockup: vi.fn(),
  }

  const liveDutyAssignmentService = {
    clearAssignmentsForMembers: vi.fn(),
  }

  const scheduleService = {
    getCurrentDdsFromSchedule: vi.fn().mockResolvedValue({
      dds: null,
      operationalDate: '2026-03-26',
    }),
  }

  Reflect.set(service, 'checkinRepo', checkinRepo)
  Reflect.set(service, 'visitorRepo', visitorRepo)
  Reflect.set(service, 'lockupRepo', lockupRepo)
  Reflect.set(service, 'presenceService', presenceService)
  Reflect.set(service, 'qualificationService', qualificationService)
  Reflect.set(service, 'liveDutyAssignmentService', liveDutyAssignmentService)
  Reflect.set(service, 'scheduleService', scheduleService)

  return {
    service,
    prisma,
    checkinRepo,
    visitorRepo,
    lockupRepo,
    presenceService,
    qualificationService,
    liveDutyAssignmentService,
    scheduleService,
  }
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
    const {
      service,
      prisma,
      checkinRepo,
      visitorRepo,
      lockupRepo,
      presenceService,
      liveDutyAssignmentService,
    } = createService()

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
    liveDutyAssignmentService.clearAssignmentsForMembers.mockResolvedValue(2)

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
    expect(liveDutyAssignmentService.clearAssignmentsForMembers).toHaveBeenCalledWith(
      ['member-1', 'member-2'],
      'lockup_execution',
      expect.any(Date)
    )
  })
})

describe('LockupService same-day reopen flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a fresh open status when reopening after a completed same-day lockup', async () => {
    const { service, prisma, lockupRepo, presenceService, qualificationService } = createService()

    vi.spyOn(service, 'getCurrentStatus').mockResolvedValue({
      id: 'status-closed',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: null,
      acquiredAt: null,
      buildingStatus: 'secured',
      securedAt: new Date('2026-03-27T01:00:00.000Z'),
      securedBy: 'member-9',
      isActive: false,
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
      updatedAt: new Date('2026-03-27T01:00:00.000Z'),
      currentHolder: null,
      securedByMember: null,
    })

    prisma.member.findUnique.mockResolvedValue({
      id: 'member-1',
      firstName: 'Pat',
      lastName: 'Holder',
      rank: 'Capt',
    })
    qualificationService.canMemberReceiveLockup.mockResolvedValue(true)
    presenceService.isMemberPresent.mockResolvedValue(true)
    lockupRepo.createStatus.mockResolvedValue({
      id: 'status-open',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: 'member-1',
      acquiredAt: new Date('2026-03-27T02:00:00.000Z'),
      buildingStatus: 'open',
      securedAt: null,
      securedBy: null,
      isActive: true,
      createdAt: new Date('2026-03-27T02:00:00.000Z'),
      updatedAt: new Date('2026-03-27T02:00:00.000Z'),
      currentHolder: null,
      securedByMember: null,
    })
    prisma.responsibilityAuditLog.create.mockResolvedValue({})

    await service.openBuilding('member-1', 'Re-open after prior lockup')

    expect(lockupRepo.createStatus).toHaveBeenCalledWith({
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: 'member-1',
      buildingStatus: 'open',
    })
    expect(lockupRepo.markOpen).not.toHaveBeenCalled()
  })

  it('creates a fresh secured cycle when acquiring lockup after a completed same-day lockup', async () => {
    const { service, prisma, lockupRepo, presenceService, qualificationService } = createService()

    vi.spyOn(service, 'getCurrentStatus').mockResolvedValue({
      id: 'status-closed',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: null,
      acquiredAt: null,
      buildingStatus: 'secured',
      securedAt: new Date('2026-03-27T01:00:00.000Z'),
      securedBy: 'member-9',
      isActive: false,
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
      updatedAt: new Date('2026-03-27T01:00:00.000Z'),
      currentHolder: null,
      securedByMember: null,
    })

    prisma.member.findUnique.mockResolvedValue({ id: 'member-1' })
    qualificationService.canMemberReceiveLockup.mockResolvedValue(true)
    presenceService.isMemberPresent.mockResolvedValue(true)
    lockupRepo.createStatus.mockResolvedValue({
      id: 'status-new',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: 'member-1',
      acquiredAt: new Date('2026-03-27T02:05:00.000Z'),
      buildingStatus: 'secured',
      securedAt: null,
      securedBy: null,
      isActive: true,
      createdAt: new Date('2026-03-27T02:05:00.000Z'),
      updatedAt: new Date('2026-03-27T02:05:00.000Z'),
      currentHolder: null,
      securedByMember: null,
    })
    prisma.responsibilityAuditLog.create.mockResolvedValue({})

    await service.acquireLockup('member-1', 'Re-acquire after prior cycle')

    expect(lockupRepo.createStatus).toHaveBeenCalledWith({
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: 'member-1',
      buildingStatus: 'secured',
    })
    expect(lockupRepo.updateHolder).not.toHaveBeenCalled()
  })

  it('lets the scheduled DDS open the building even without a separate lockup qualification', async () => {
    const { service, prisma, lockupRepo, presenceService, qualificationService, scheduleService } =
      createService()

    vi.spyOn(service, 'getCurrentStatus').mockResolvedValue({
      id: 'status-secured',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: null,
      acquiredAt: null,
      buildingStatus: 'secured',
      securedAt: new Date('2026-03-26T06:00:00.000Z'),
      securedBy: 'member-9',
      isActive: true,
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
      updatedAt: new Date('2026-03-26T06:00:00.000Z'),
      currentHolder: null,
      securedByMember: null,
    })

    prisma.member.findUnique.mockResolvedValue({
      id: 'member-2',
      firstName: 'Taylor',
      lastName: 'Reed',
      rank: 'SLt',
    })
    prisma.ddsAssignment.findFirst.mockResolvedValue(null)
    qualificationService.canMemberReceiveLockup.mockResolvedValue(false)
    scheduleService.getCurrentDdsFromSchedule.mockResolvedValue({
      dds: {
        assignmentId: 'schedule-assignment-1',
        member: {
          id: 'member-2',
          firstName: 'Taylor',
          lastName: 'Reed',
          rank: 'SLt',
          serviceNumber: '44221',
        },
        scheduleId: 'schedule-1',
        status: 'confirmed',
        weekStartDate: '2026-03-23',
      },
      operationalDate: '2026-03-26',
    })
    presenceService.isMemberPresent.mockResolvedValue(true)
    lockupRepo.markOpen.mockResolvedValue({
      id: 'status-open',
      date: new Date('2026-03-26T00:00:00.000Z'),
      currentHolderId: 'member-2',
      acquiredAt: new Date('2026-03-26T08:00:00.000Z'),
      buildingStatus: 'open',
      securedAt: null,
      securedBy: null,
      isActive: true,
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
      currentHolder: null,
      securedByMember: null,
    })
    prisma.responsibilityAuditLog.create.mockResolvedValue({})

    await expect(service.openBuilding('member-2')).resolves.toMatchObject({
      currentHolderId: 'member-2',
      buildingStatus: 'open',
    })
  })
})
