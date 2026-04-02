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
    findMany: ReturnType<typeof vi.fn>
  }
  ddsAssignment: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  responsibilityAuditLog: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
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
      findMany: vi.fn().mockResolvedValue([]),
    },
    ddsAssignment: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    responsibilityAuditLog: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
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

function createLockupStatus(overrides: Partial<Record<string, unknown>> = {}): {
  id: string
  date: Date
  currentHolderId: string | null
  acquiredAt: Date | null
  buildingStatus: 'secured' | 'open' | 'locking_up'
  securedAt: Date | null
  securedBy: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  currentHolder: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  } | null
  securedByMember: null
} {
  return {
    id: 'lockup-status-1',
    date: new Date('2026-03-04T00:00:00.000Z'),
    currentHolderId: null,
    acquiredAt: null,
    buildingStatus: 'secured',
    securedAt: null,
    securedBy: null,
    isActive: true,
    createdAt: new Date('2026-03-04T00:00:00.000Z'),
    updatedAt: new Date('2026-03-04T00:00:00.000Z'),
    currentHolder: null,
    securedByMember: null,
    ...overrides,
  }
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
        dds: createScheduledDds(),
        operationalDate: '2026-03-04',
      }),
    }
    ;(
      service as unknown as {
        lockupService: { getCurrentStatus: ReturnType<typeof vi.fn> }
      }
    ).lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue(createLockupStatus()),
    }
    ;(
      service as unknown as {
        presenceService: {
          getPresentMembers: ReturnType<typeof vi.fn>
          getActiveVisitorCount: ReturnType<typeof vi.fn>
        }
      }
    ).presenceService = {
      getPresentMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Stone',
          rank: 'PO1',
          checkedInAt: '2026-03-04T08:00:00.000Z',
        },
      ]),
      getActiveVisitorCount: vi.fn().mockResolvedValue(0),
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
    expect(state.promptVariant).toBe('expected_dds')
    expect(state.expectedDds).toMatchObject({
      source: 'live',
      matchesScannedMember: true,
      member: {
        id: 'member-1',
      },
    })
    expect(state.presentMembers).toHaveLength(1)
    expect(state.presentVisitorCount).toBe(0)
    expect(state.todayCycles).toEqual([])
  })

  it('prefers the live DDS assignment when determining the expected DDS', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-2' }))

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    ;(
      service as unknown as {
        getCurrentDds: ReturnType<typeof vi.fn>
      }
    ).getCurrentDds = vi.fn().mockResolvedValue(
      createAssignment({
        memberId: 'member-1',
        status: 'pending',
      })
    )
    ;(
      service as unknown as {
        scheduleService: { getCurrentDdsFromSchedule: ReturnType<typeof vi.fn> }
      }
    ).scheduleService = {
      getCurrentDdsFromSchedule: vi.fn().mockResolvedValue({
        dds: createScheduledDds({
          member: {
            id: 'member-3',
            firstName: 'Jamie',
            lastName: 'Cole',
            rank: 'CPO2',
            serviceNumber: '99887',
          },
        }),
        operationalDate: '2026-03-04',
      }),
    }
    ;(
      service as unknown as {
        lockupService: { getCurrentStatus: ReturnType<typeof vi.fn> }
      }
    ).lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue(createLockupStatus()),
    }
    ;(
      service as unknown as {
        presenceService: {
          getPresentMembers: ReturnType<typeof vi.fn>
          getActiveVisitorCount: ReturnType<typeof vi.fn>
        }
      }
    ).presenceService = {
      getPresentMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-2',
          firstName: 'Alex',
          lastName: 'Stone',
          rank: 'PO1',
          checkedInAt: '2026-03-04T08:05:00.000Z',
        },
      ]),
      getActiveVisitorCount: vi.fn().mockResolvedValue(0),
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

    const state = await service.getKioskResponsibilityState('member-2')

    expect(state.expectedDds).toMatchObject({
      source: 'live',
      matchesScannedMember: false,
      member: {
        id: 'member-1',
      },
    })
    expect(state.promptVariant).toBe('replacement_candidate')
  })

  it('shows current open context when the building is already open and DDS is still pending', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-3' }))
    prismaMock.member.findMany.mockResolvedValue([
      createMemberSummary(),
      createMemberSummary({
        id: 'member-2',
        firstName: 'Morgan',
        lastName: 'Lee',
        rank: 'PO2',
      }),
    ])
    prismaMock.responsibilityAuditLog.findMany.mockResolvedValue([
      {
        id: 'log-open-1',
        memberId: 'member-1',
        tagName: 'Lockup',
        action: 'building_opened',
        fromMemberId: null,
        toMemberId: null,
        performedBy: 'member-1',
        performedByType: 'member',
        timestamp: new Date('2026-03-04T08:00:00.000Z'),
        notes: null,
      },
    ])

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    ;(
      service as unknown as {
        getCurrentDds: ReturnType<typeof vi.fn>
      }
    ).getCurrentDds = vi.fn().mockResolvedValue(
      createAssignment({
        memberId: 'member-1',
        status: 'pending',
      })
    )
    ;(
      service as unknown as {
        scheduleService: { getCurrentDdsFromSchedule: ReturnType<typeof vi.fn> }
      }
    ).scheduleService = {
      getCurrentDdsFromSchedule: vi.fn().mockResolvedValue({
        dds: createScheduledDds(),
        operationalDate: '2026-03-04',
      }),
    }
    ;(
      service as unknown as {
        lockupService: { getCurrentStatus: ReturnType<typeof vi.fn> }
      }
    ).lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue(
        createLockupStatus({
          buildingStatus: 'open',
          currentHolderId: 'member-1',
          acquiredAt: new Date('2026-03-04T08:00:00.000Z'),
          currentHolder: {
            id: 'member-1',
            firstName: 'Alex',
            lastName: 'Stone',
            rank: 'PO1',
            serviceNumber: '12345',
          },
        })
      ),
    }
    ;(
      service as unknown as {
        presenceService: {
          getPresentMembers: ReturnType<typeof vi.fn>
          getActiveVisitorCount: ReturnType<typeof vi.fn>
        }
      }
    ).presenceService = {
      getPresentMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Stone',
          rank: 'PO1',
          checkedInAt: '2026-03-04T08:00:00.000Z',
        },
        {
          id: 'member-3',
          firstName: 'Riley',
          lastName: 'Parks',
          rank: 'S1',
          checkedInAt: '2026-03-04T08:20:00.000Z',
        },
      ]),
      getActiveVisitorCount: vi.fn().mockResolvedValue(2),
    }
    ;(
      service as unknown as {
        qualificationService: {
          memberHasActiveQualificationCode: ReturnType<typeof vi.fn>
          canMemberReceiveLockup: ReturnType<typeof vi.fn>
        }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(false),
      canMemberReceiveLockup: vi.fn().mockResolvedValue(false),
    }
    stubNoHandover(service)

    const state = await service.getKioskResponsibilityState('member-3')

    expect(state.promptVariant).toBe('building_open_dds_pending')
    expect(state.currentOpenContext).toMatchObject({
      openedBy: {
        id: 'member-1',
      },
      openedAt: '2026-03-04T08:00:00.000Z',
      currentLockupHolder: {
        id: 'member-1',
      },
      currentHolderAcquiredAt: '2026-03-04T08:00:00.000Z',
    })
    expect(state.presentMembers).toHaveLength(2)
    expect(state.presentVisitorCount).toBe(2)
    expect(state.todayCycles).toEqual([
      expect.objectContaining({
        id: 'log-open-1',
        isCurrent: true,
      }),
    ])
  })

  it('reports the opener separately from the current lockup holder after lockup is transferred', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-4' }))
    prismaMock.member.findMany.mockResolvedValue([
      createMemberSummary(),
      createMemberSummary({
        id: 'member-2',
        firstName: 'Jordan',
        lastName: 'West',
        rank: 'SLt',
      }),
    ])
    prismaMock.responsibilityAuditLog.findMany.mockResolvedValue([
      {
        id: 'log-open-1',
        memberId: 'member-1',
        tagName: 'Lockup',
        action: 'building_opened',
        fromMemberId: null,
        toMemberId: null,
        performedBy: 'member-1',
        performedByType: 'member',
        timestamp: new Date('2026-03-04T07:45:00.000Z'),
        notes: null,
      },
    ])

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    ;(
      service as unknown as {
        getCurrentDds: ReturnType<typeof vi.fn>
      }
    ).getCurrentDds = vi.fn().mockResolvedValue(
      createAssignment({
        memberId: 'member-1',
        status: 'pending',
      })
    )
    ;(
      service as unknown as {
        scheduleService: { getCurrentDdsFromSchedule: ReturnType<typeof vi.fn> }
      }
    ).scheduleService = {
      getCurrentDdsFromSchedule: vi.fn().mockResolvedValue({
        dds: createScheduledDds(),
        operationalDate: '2026-03-04',
      }),
    }
    ;(
      service as unknown as {
        lockupService: { getCurrentStatus: ReturnType<typeof vi.fn> }
      }
    ).lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue(
        createLockupStatus({
          buildingStatus: 'open',
          currentHolderId: 'member-2',
          acquiredAt: new Date('2026-03-04T08:30:00.000Z'),
          currentHolder: {
            id: 'member-2',
            firstName: 'Jordan',
            lastName: 'West',
            rank: 'SLt',
            serviceNumber: '22334',
          },
        })
      ),
    }
    ;(
      service as unknown as {
        presenceService: {
          getPresentMembers: ReturnType<typeof vi.fn>
          getActiveVisitorCount: ReturnType<typeof vi.fn>
        }
      }
    ).presenceService = {
      getPresentMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-1',
          firstName: 'Alex',
          lastName: 'Stone',
          rank: 'PO1',
          checkedInAt: '2026-03-04T07:45:00.000Z',
        },
        {
          id: 'member-4',
          firstName: 'Drew',
          lastName: 'Nguyen',
          rank: 'S2',
          checkedInAt: '2026-03-04T09:00:00.000Z',
        },
      ]),
      getActiveVisitorCount: vi.fn().mockResolvedValue(0),
    }
    ;(
      service as unknown as {
        qualificationService: {
          memberHasActiveQualificationCode: ReturnType<typeof vi.fn>
          canMemberReceiveLockup: ReturnType<typeof vi.fn>
        }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(false),
      canMemberReceiveLockup: vi.fn().mockResolvedValue(false),
    }
    stubNoHandover(service)

    const state = await service.getKioskResponsibilityState('member-4')

    expect(state.currentOpenContext?.openedBy?.id).toBe('member-1')
    expect(state.currentOpenContext?.currentLockupHolder?.id).toBe('member-2')
    expect(state.currentOpenContext?.currentHolderAcquiredAt).toBe('2026-03-04T08:30:00.000Z')
  })

  it('builds same-day open and close cycles with the current cycle highlighted', async () => {
    prismaMock.member.findUnique.mockResolvedValue(createMemberSummary({ id: 'member-3' }))
    prismaMock.member.findMany.mockResolvedValue([
      createMemberSummary(),
      createMemberSummary({
        id: 'member-2',
        firstName: 'Taylor',
        lastName: 'Reed',
        rank: 'SLt',
      }),
    ])
    prismaMock.responsibilityAuditLog.findMany.mockResolvedValue([
      {
        id: 'log-open-1',
        memberId: 'member-1',
        tagName: 'Lockup',
        action: 'building_opened',
        fromMemberId: null,
        toMemberId: null,
        performedBy: 'member-1',
        performedByType: 'member',
        timestamp: new Date('2026-03-04T07:00:00.000Z'),
        notes: null,
      },
      {
        id: 'log-lockup-1',
        memberId: 'member-1',
        tagName: 'Lockup',
        action: 'building_lockup',
        fromMemberId: null,
        toMemberId: null,
        performedBy: 'member-1',
        performedByType: 'member',
        timestamp: new Date('2026-03-04T09:00:00.000Z'),
        notes: null,
      },
      {
        id: 'log-open-2',
        memberId: 'member-2',
        tagName: 'Lockup',
        action: 'building_opened',
        fromMemberId: null,
        toMemberId: null,
        performedBy: 'member-2',
        performedByType: 'member',
        timestamp: new Date('2026-03-04T10:15:00.000Z'),
        notes: null,
      },
    ])

    const service = new DdsService(prismaMock as unknown as PrismaClient)
    ;(
      service as unknown as {
        getCurrentDds: ReturnType<typeof vi.fn>
      }
    ).getCurrentDds = vi.fn().mockResolvedValue(
      createAssignment({
        memberId: 'member-1',
        status: 'pending',
      })
    )
    ;(
      service as unknown as {
        scheduleService: { getCurrentDdsFromSchedule: ReturnType<typeof vi.fn> }
      }
    ).scheduleService = {
      getCurrentDdsFromSchedule: vi.fn().mockResolvedValue({
        dds: createScheduledDds(),
        operationalDate: '2026-03-04',
      }),
    }
    ;(
      service as unknown as {
        lockupService: { getCurrentStatus: ReturnType<typeof vi.fn> }
      }
    ).lockupService = {
      getCurrentStatus: vi.fn().mockResolvedValue(
        createLockupStatus({
          buildingStatus: 'open',
          currentHolderId: 'member-2',
          acquiredAt: new Date('2026-03-04T10:15:00.000Z'),
          currentHolder: {
            id: 'member-2',
            firstName: 'Taylor',
            lastName: 'Reed',
            rank: 'SLt',
            serviceNumber: '44221',
          },
        })
      ),
    }
    ;(
      service as unknown as {
        presenceService: {
          getPresentMembers: ReturnType<typeof vi.fn>
          getActiveVisitorCount: ReturnType<typeof vi.fn>
        }
      }
    ).presenceService = {
      getPresentMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-2',
          firstName: 'Taylor',
          lastName: 'Reed',
          rank: 'SLt',
          checkedInAt: '2026-03-04T10:15:00.000Z',
        },
        {
          id: 'member-3',
          firstName: 'Casey',
          lastName: 'Wright',
          rank: 'PO2',
          checkedInAt: '2026-03-04T10:45:00.000Z',
        },
      ]),
      getActiveVisitorCount: vi.fn().mockResolvedValue(1),
    }
    ;(
      service as unknown as {
        qualificationService: {
          memberHasActiveQualificationCode: ReturnType<typeof vi.fn>
          canMemberReceiveLockup: ReturnType<typeof vi.fn>
        }
      }
    ).qualificationService = {
      memberHasActiveQualificationCode: vi.fn().mockResolvedValue(false),
      canMemberReceiveLockup: vi.fn().mockResolvedValue(false),
    }
    stubNoHandover(service)

    const state = await service.getKioskResponsibilityState('member-3')

    expect(state.todayCycles).toEqual([
      expect.objectContaining({
        id: 'log-open-1',
        closedAt: '2026-03-04T09:00:00.000Z',
        isCurrent: false,
      }),
      expect.objectContaining({
        id: 'log-open-2',
        closedAt: null,
        isCurrent: true,
      }),
    ])
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
