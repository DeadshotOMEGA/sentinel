import type { PrismaClient } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../websocket/broadcast.js', async () => {
  const actual = await vi.importActual<typeof import('../websocket/broadcast.js')>(
    '../websocket/broadcast.js'
  )

  return {
    ...actual,
    broadcastDdsUpdate: vi.fn(),
  }
})

import { DdsService } from './dds-service.js'
import { broadcastDdsUpdate } from '../websocket/broadcast.js'

interface PrismaMock {
  adminUser: {
    findUnique: ReturnType<typeof vi.fn>
  }
  member: {
    findUnique: ReturnType<typeof vi.fn>
  }
  ddsAssignment: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  responsibilityAuditLog: {
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

function createPrismaMock(): PrismaMock {
  return {
    adminUser: {
      findUnique: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
    },
    ddsAssignment: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    responsibilityAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  }
}

function createAssignment(overrides: Partial<Record<string, unknown>> = {}) {
  const today = new Date('2026-03-04T00:00:00.000Z')

  return {
    id: 'dds-1',
    memberId: 'member-1',
    assignedDate: today,
    acceptedAt: null,
    releasedAt: null,
    transferredTo: null,
    assignedBy: null,
    status: 'pending',
    notes: null,
    createdAt: today,
    updatedAt: today,
    member: {
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Stone',
      rank: 'PO1',
      division: {
        name: 'Operations',
      },
    },
    assignedByAdmin: null,
    ...overrides,
  }
}

function createMemberSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'member-1',
    firstName: 'Alex',
    lastName: 'Stone',
    rank: 'PO1',
    ...overrides,
  }
}

function createScheduledDds(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    scheduleId: 'schedule-1',
    assignmentId: 'schedule-assignment-1',
    member: {
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Stone',
      rank: 'PO1',
      serviceNumber: '12345',
    },
    weekStartDate: '2026-03-02',
    status: 'assigned',
    ...overrides,
  }
}

function stubNoHandover(service: DdsService) {
  ;(
    service as unknown as {
      getWeeklyHandoverContext: ReturnType<typeof vi.fn>
    }
  ).getWeeklyHandoverContext = vi.fn().mockResolvedValue(null)
}

describe('DdsService', () => {
  let prismaMock: PrismaMock

  beforeEach(() => {
    prismaMock = createPrismaMock()
    vi.mocked(broadcastDdsUpdate).mockReset()
  })

  it('accepts the scheduled DDS and transfers lockup when someone else opened the building', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary())
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(createAssignment())
    prismaMock.ddsAssignment.update.mockResolvedValue(
      createAssignment({
        status: 'active',
        acceptedAt: new Date('2026-03-04T08:00:00.000Z'),
      })
    )
    prismaMock.responsibilityAuditLog.create.mockResolvedValue({})

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    const lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue({
        currentHolderId: 'holder-1',
        buildingStatus: 'open',
      }),
      transferLockup: vi.fn().mockResolvedValue({}),
      acquireLockup: vi.fn(),
      openBuilding: vi.fn(),
    }

    ;(service as unknown as { lockupService: typeof lockupService }).lockupService = lockupService
    ;(
      service as unknown as {
        presenceService: { isMemberPresent: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      isMemberPresent: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        qualificationService: { memberHasActiveQualificationCode: ReturnType<typeof vi.fn> }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
    }
    stubNoHandover(service)

    const assignment = await service.acceptDds('member-1')

    expect(assignment.status).toBe('active')
    expect(lockupService.transferLockup).toHaveBeenCalledWith(
      'member-1',
      'dds_handoff',
      'Auto-transferred on DDS acceptance'
    )
    expect(lockupService.openBuilding).not.toHaveBeenCalled()
    expect(vi.mocked(broadcastDdsUpdate)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'accepted',
        assignment: expect.objectContaining({ memberId: 'member-1', status: 'active' }),
      })
    )
  })

  it('allows a DDS-qualified member to take over from a different pending scheduled DDS', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-2' }))
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(
      createAssignment({
        memberId: 'member-1',
        member: {
          id: 'member-1',
          firstName: 'Taylor',
          lastName: 'Reed',
          rank: 'SLt',
          division: {
            name: 'Operations',
          },
        },
      })
    )
    prismaMock.ddsAssignment.update.mockResolvedValue({})
    prismaMock.ddsAssignment.create.mockResolvedValue(
      createAssignment({
        id: 'dds-2',
        memberId: 'member-2',
        status: 'active',
        acceptedAt: new Date('2026-03-04T08:10:00.000Z'),
        notes: 'Same-day kiosk DDS takeover from scheduled member',
        member: {
          id: 'member-2',
          firstName: 'Alex',
          lastName: 'Stone',
          rank: 'PO1',
          division: {
            name: 'Operations',
          },
        },
      })
    )
    prismaMock.responsibilityAuditLog.create.mockResolvedValue({})

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    const lockupService = {
      getCurrentStatus: vi
        .fn()
        .mockResolvedValueOnce({ currentHolderId: null, buildingStatus: 'secured' })
        .mockResolvedValueOnce({ currentHolderId: null, buildingStatus: 'secured' }),
      transferLockup: vi.fn(),
      acquireLockup: vi.fn().mockResolvedValue({}),
      openBuilding: vi.fn().mockResolvedValue({}),
    }

    ;(service as unknown as { lockupService: typeof lockupService }).lockupService = lockupService
    ;(
      service as unknown as {
        presenceService: { isMemberPresent: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      isMemberPresent: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        qualificationService: { memberHasActiveQualificationCode: ReturnType<typeof vi.fn> }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
    }
    stubNoHandover(service)

    const assignment = await service.acceptDds('member-2')

    expect(assignment.memberId).toBe('member-2')
    expect(lockupService.acquireLockup).toHaveBeenCalledWith(
      'member-2',
      'Auto-acquired on DDS acceptance'
    )
    expect(lockupService.openBuilding).toHaveBeenCalledWith(
      'member-2',
      'Auto-opened on DDS acceptance'
    )
    expect(prismaMock.responsibilityAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'transferred',
          fromMemberId: 'member-1',
          toMemberId: 'member-2',
        }),
      })
    )
    expect(vi.mocked(broadcastDdsUpdate)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'transferred',
        assignment: expect.objectContaining({ memberId: 'member-2' }),
      })
    )
  })

  it('lets an admin replace the live DDS and moves lockup to the replacement', async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue({ id: 'admin-1' })
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-2' }))
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(
      createAssignment({
        memberId: 'member-1',
        status: 'active',
        acceptedAt: new Date('2026-03-04T07:00:00.000Z'),
      })
    )
    prismaMock.ddsAssignment.update.mockResolvedValue({})
    prismaMock.ddsAssignment.create.mockResolvedValue(
      createAssignment({
        id: 'dds-2',
        memberId: 'member-2',
        status: 'active',
        assignedBy: 'admin-1',
        acceptedAt: new Date('2026-03-04T09:00:00.000Z'),
        member: {
          id: 'member-2',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          division: {
            name: 'Operations',
          },
        },
      })
    )
    prismaMock.responsibilityAuditLog.create.mockResolvedValue({})

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    const lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue({
        currentHolderId: 'member-1',
        buildingStatus: 'open',
      }),
      transferLockup: vi.fn().mockResolvedValue({}),
      acquireLockup: vi.fn(),
      openBuilding: vi.fn(),
    }

    ;(service as unknown as { lockupService: typeof lockupService }).lockupService = lockupService
    ;(
      service as unknown as {
        presenceService: { isMemberPresent: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      isMemberPresent: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        qualificationService: { memberHasActiveQualificationCode: ReturnType<typeof vi.fn> }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
    }
    stubNoHandover(service)

    const assignment = await service.setTodayDds(
      'member-2',
      'admin-1',
      'Scheduled DDS called in sick'
    )

    expect(assignment.memberId).toBe('member-2')
    expect(lockupService.transferLockup).toHaveBeenCalledWith(
      'member-2',
      'dds_handoff',
      'Auto-transferred on admin DDS assignment'
    )
    expect(prismaMock.responsibilityAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'transferred',
          fromMemberId: 'member-1',
          toMemberId: 'member-2',
          performedBy: 'admin-1',
        }),
      })
    )
  })

  it('allows member-session admin actions without writing an invalid assignedBy foreign key', async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue(null)
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-2' }))
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(null)
    prismaMock.ddsAssignment.create.mockResolvedValue(
      createAssignment({
        id: 'dds-2',
        memberId: 'member-2',
        status: 'active',
        assignedBy: null,
        acceptedAt: new Date('2026-03-04T09:00:00.000Z'),
        member: {
          id: 'member-2',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          division: {
            name: 'Operations',
          },
        },
      })
    )
    prismaMock.responsibilityAuditLog.create.mockResolvedValue({})

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    const lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue({
        currentHolderId: 'member-2',
        buildingStatus: 'open',
      }),
      transferLockup: vi.fn(),
      acquireLockup: vi.fn(),
      openBuilding: vi.fn(),
    }

    ;(service as unknown as { lockupService: typeof lockupService }).lockupService = lockupService
    ;(
      service as unknown as {
        presenceService: { isMemberPresent: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      isMemberPresent: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        qualificationService: { memberHasActiveQualificationCode: ReturnType<typeof vi.fn> }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
    }
    stubNoHandover(service)

    const assignment = await service.setTodayDds('member-2', 'member-acting-admin')

    expect(assignment.memberId).toBe('member-2')
    expect(prismaMock.adminUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'member-acting-admin' },
      select: { id: true },
    })
    expect(prismaMock.ddsAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberId: 'member-2',
          assignedBy: null,
          status: 'active',
        }),
      })
    )
    expect(prismaMock.responsibilityAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          performedBy: 'member-acting-admin',
          performedByType: 'admin',
        }),
      })
    )
  })

  it('computes kiosk responsibility state from present members and unresolved DDS/building state', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary())
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(null)

    const service = new DdsService(prismaMock as unknown as PrismaClient)

    ;(
      service as unknown as {
        scheduleService: { getCurrentDdsFromSchedule: ReturnType<typeof vi.fn> }
      }
    ).scheduleService = {
      getCurrentDdsFromSchedule: vi.fn().mockResolvedValue({
        dds: null,
        operationalDate: '2026-03-04',
      }),
    }
    ;(
      service as unknown as {
        lockupService: { getCurrentStatus: ReturnType<typeof vi.fn> }
      }
    ).lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue({
        buildingStatus: 'secured',
        currentHolder: null,
      }),
    }
    ;(
      service as unknown as {
        presenceService: { getPresentMembers: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      getPresentMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Stone',
          rank: 'PO1',
        },
      ]),
    }
    ;(
      service as unknown as {
        qualificationService: {
          memberHasActiveQualificationCode: ReturnType<typeof vi.fn>
          canMemberReceiveLockup: ReturnType<typeof vi.fn>
        }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
      canMemberReceiveLockup: vi.fn().mockResolvedValue(true),
    }
    stubNoHandover(service)

    const state = await service.getKioskResponsibilityState('member-1')

    expect(state.isFirstMemberCheckin).toBe(true)
    expect(state.needsDds).toBe(true)
    expect(state.needsBuildingOpen).toBe(true)
    expect(state.shouldPrompt).toBe(true)
    expect(state.canAcceptDds).toBe(true)
    expect(state.canOpenBuilding).toBe(true)
  })

  it('treats the outgoing scheduled DDS as active while weekly handover is pending', async () => {
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(null)

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    ;(
      service as unknown as {
        getWeeklyHandoverContext: ReturnType<typeof vi.fn>
      }
    ).getWeeklyHandoverContext = vi.fn().mockResolvedValue({
      firstOperationalDay: new Date('2026-03-09T00:00:00.000Z'),
      outgoingDds: createScheduledDds(),
      incomingDds: createScheduledDds({
        assignmentId: 'schedule-assignment-2',
        member: {
          id: 'member-2',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          serviceNumber: '54321',
        },
        weekStartDate: '2026-03-09',
      }),
    })

    const currentDds = await service.getCurrentDds()

    expect(currentDds).not.toBeNull()
    expect(currentDds?.memberId).toBe('member-1')
    expect(currentDds?.status).toBe('active')
    expect(currentDds?.notes).toContain('handover')
  })

  it('blocks a new member from accepting DDS before the outgoing DDS transfers it', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-2' }))
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(null)

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    ;(
      service as unknown as {
        presenceService: { isMemberPresent: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      isMemberPresent: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        qualificationService: { memberHasActiveQualificationCode: ReturnType<typeof vi.fn> }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        getWeeklyHandoverContext: ReturnType<typeof vi.fn>
      }
    ).getWeeklyHandoverContext = vi.fn().mockResolvedValue({
      firstOperationalDay: new Date('2026-03-09T00:00:00.000Z'),
      outgoingDds: createScheduledDds(),
      incomingDds: createScheduledDds({
        assignmentId: 'schedule-assignment-2',
        member: {
          id: 'member-2',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          serviceNumber: '54321',
        },
        weekStartDate: '2026-03-09',
      }),
    })

    await expect(service.acceptDds('member-2')).rejects.toThrow(
      'DDS handover is still pending; the outgoing DDS must transfer responsibility before another member can accept today'
    )
  })

  it('transfers DDS from the outgoing weekly DDS when handover has not been persisted yet', async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue({ id: 'admin-1' })
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-2' }))
    prismaMock.ddsAssignment.findFirst.mockResolvedValue(null)
    prismaMock.ddsAssignment.create.mockResolvedValue(
      createAssignment({
        id: 'dds-2',
        memberId: 'member-2',
        status: 'active',
        assignedBy: 'admin-1',
        acceptedAt: new Date('2026-03-09T09:00:00.000Z'),
        member: {
          id: 'member-2',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          division: {
            name: 'Operations',
          },
        },
      })
    )
    prismaMock.responsibilityAuditLog.create.mockResolvedValue({})

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    const lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue({
        currentHolderId: 'member-1',
        buildingStatus: 'open',
      }),
      transferLockup: vi.fn().mockResolvedValue({}),
      acquireLockup: vi.fn(),
      openBuilding: vi.fn(),
    }

    ;(service as unknown as { lockupService: typeof lockupService }).lockupService = lockupService
    ;(
      service as unknown as {
        presenceService: { isMemberPresent: ReturnType<typeof vi.fn> }
      }
    ).presenceService = {
      isMemberPresent: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        qualificationService: { memberHasActiveQualificationCode: ReturnType<typeof vi.fn> }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(true),
    }
    ;(
      service as unknown as {
        getWeeklyHandoverContext: ReturnType<typeof vi.fn>
      }
    ).getWeeklyHandoverContext = vi.fn().mockResolvedValue({
      firstOperationalDay: new Date('2026-03-09T00:00:00.000Z'),
      outgoingDds: createScheduledDds(),
      incomingDds: createScheduledDds({
        assignmentId: 'schedule-assignment-2',
        member: {
          id: 'member-2',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          serviceNumber: '54321',
        },
        weekStartDate: '2026-03-09',
      }),
    })

    const assignment = await service.transferDds(
      'member-2',
      'admin-1',
      'Weekly DDS handover completed'
    )

    expect(assignment.memberId).toBe('member-2')
    expect(lockupService.transferLockup).toHaveBeenCalledWith(
      'member-2',
      'dds_handoff',
      'Auto-transferred on admin DDS assignment'
    )
    expect(prismaMock.responsibilityAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'transferred',
          fromMemberId: 'member-1',
          toMemberId: 'member-2',
        }),
      })
    )
  })
})
