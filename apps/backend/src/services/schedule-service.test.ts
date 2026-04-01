import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleService } from './schedule-service.js'
import {
  applyOperationalTimingsRuntimeState,
  getDefaultOperationalTimingsSettings,
} from '../lib/operational-timings-runtime.js'

vi.mock('../websocket/broadcast.js', async () => {
  const actual = await vi.importActual<typeof import('../websocket/broadcast.js')>(
    '../websocket/broadcast.js'
  )

  return {
    ...actual,
    broadcastScheduleUpdate: vi.fn(),
    broadcastScheduleAssignmentUpdate: vi.fn(),
  }
})

interface RepositoryMock {
  findScheduleById: ReturnType<typeof vi.fn>
  findDutyRoleById: ReturnType<typeof vi.fn>
  createOverride: ReturnType<typeof vi.fn>
  findDdsAssignmentForWeek: ReturnType<typeof vi.fn>
  findDutyWatchForWeek: ReturnType<typeof vi.fn>
  findMemberDutyAssignmentsBetween: ReturnType<typeof vi.fn>
}

function createRepositoryMock(): RepositoryMock {
  return {
    findScheduleById: vi.fn(),
    findDutyRoleById: vi.fn(),
    createOverride: vi.fn(),
    findDdsAssignmentForWeek: vi.fn(),
    findDutyWatchForWeek: vi.fn(),
    findMemberDutyAssignmentsBetween: vi.fn(),
  }
}

function createDutyWatchSchedule() {
  return {
    id: 'schedule-1',
    dutyRoleId: 'role-1',
    dutyRole: { code: 'DUTY_WATCH' },
    status: 'draft',
    weekStartDate: new Date('2026-03-02T00:00:00.000Z'),
  }
}

function createScheduleEntity({
  id,
  code,
  weekStartDate,
}: {
  id: string
  code: 'DDS' | 'DUTY_WATCH'
  weekStartDate: string
}) {
  const weekStart = new Date(`${weekStartDate}T00:00:00.000Z`)

  return {
    id,
    dutyRoleId: `${code.toLowerCase()}-role`,
    dutyRole: { id: `${code.toLowerCase()}-role`, code, name: code },
    status: 'published',
    weekStartDate: weekStart,
    createdBy: null,
    publishedAt: null,
    publishedBy: null,
    notes: null,
    createdAt: weekStart,
    updatedAt: weekStart,
  }
}

function createAssignmentEntity({
  id,
  memberId,
  status = 'confirmed',
}: {
  id: string
  memberId: string
  status?: 'assigned' | 'confirmed' | 'released'
}) {
  const timestamp = new Date('2026-03-03T12:00:00.000Z')

  return {
    id,
    scheduleId: 'schedule-1',
    dutyPositionId: null,
    memberId,
    status,
    confirmedAt: null,
    releasedAt: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    member: {
      id: memberId,
      firstName: 'Alex',
      lastName: 'Example',
      rank: 'Cpl',
      serviceNumber: '123456',
    },
    dutyPosition: null,
  }
}

describe('ScheduleService.createDwOverride configured day validation', () => {
  let repositoryMock: RepositoryMock

  beforeEach(() => {
    repositoryMock = createRepositoryMock()
    applyOperationalTimingsRuntimeState({
      settings: {
        ...getDefaultOperationalTimingsSettings(),
        operational: {
          ...getDefaultOperationalTimingsSettings().operational,
          dutyWatchRules: [
            {
              id: 'dw-mon',
              name: 'Monday Duty Watch',
              effectiveStartDate: '2026-03-02',
              startTime: '19:00',
              endTime: '22:00',
              recurrence: { type: 'weekly', weekday: 1, intervalWeeks: 1 },
            },
            {
              id: 'dw-wed',
              name: 'Wednesday Duty Watch',
              effectiveStartDate: '2026-03-04',
              startTime: '19:00',
              endTime: '22:00',
              recurrence: { type: 'weekly', weekday: 3, intervalWeeks: 1 },
            },
            {
              id: 'dw-fri',
              name: 'Friday Duty Watch',
              effectiveStartDate: '2026-03-06',
              startTime: '19:00',
              endTime: '22:00',
              recurrence: { type: 'weekly', weekday: 5, intervalWeeks: 1 },
            },
          ],
        },
      },
      source: 'stored',
      updatedAt: null,
    })
  })

  function createServiceWithRepositoryMock(): ScheduleService {
    const service = new ScheduleService({} as PrismaClientInstance)
    ;(service as unknown as { repository: RepositoryMock }).repository = repositoryMock
    return service
  }

  it('rejects override nights that are not configured Duty Watch days', async () => {
    repositoryMock.findScheduleById.mockResolvedValue(createDutyWatchSchedule())

    const service = createServiceWithRepositoryMock()

    await expect(
      service.createDwOverride('schedule-1', {
        nightDate: '2026-03-03', // Tuesday, not allowed when configured days are Mon/Wed/Fri
        dutyPositionId: 'position-swk',
        overrideType: 'add',
        memberId: 'member-1',
      })
    ).rejects.toThrow('configured Duty Watch occurrence')

    expect(repositoryMock.createOverride).not.toHaveBeenCalled()
  })

  it('allows override nights on configured Duty Watch days', async () => {
    repositoryMock.findScheduleById.mockResolvedValue(createDutyWatchSchedule())
    repositoryMock.findDutyRoleById.mockResolvedValue({
      positions: [{ id: 'position-swk' }],
    })
    repositoryMock.createOverride.mockResolvedValue({ id: 'override-1' })

    const service = createServiceWithRepositoryMock()
    const result = await service.createDwOverride('schedule-1', {
      nightDate: '2026-03-06', // Friday
      dutyPositionId: 'position-swk',
      overrideType: 'add',
      memberId: 'member-1',
    })

    expect(result).toEqual({ id: 'override-1' })
    expect(repositoryMock.createOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-1',
        dutyPositionId: 'position-swk',
        overrideType: 'add',
        memberId: 'member-1',
      })
    )
  })
})

describe('ScheduleService.getMemberAssignmentSummary', () => {
  let repositoryMock: RepositoryMock

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T12:00:00.000Z'))
    repositoryMock = createRepositoryMock()
    applyOperationalTimingsRuntimeState({
      settings: getDefaultOperationalTimingsSettings(),
      source: 'stored',
      updatedAt: null,
    })
  })

  function createServiceWithRepositoryMock(): ScheduleService {
    const service = new ScheduleService({} as PrismaClientInstance)
    ;(service as unknown as { repository: RepositoryMock }).repository = repositoryMock
    return service
  }

  it('returns current and upcoming kiosk assignments for a member', async () => {
    repositoryMock.findDdsAssignmentForWeek.mockResolvedValue({
      schedule: createScheduleEntity({
        id: 'dds-schedule',
        code: 'DDS',
        weekStartDate: '2026-03-02',
      }),
      assignment: createAssignmentEntity({
        id: 'dds-assignment',
        memberId: 'member-1',
      }),
    })
    repositoryMock.findDutyWatchForWeek.mockResolvedValue({
      schedule: createScheduleEntity({
        id: 'dw-schedule',
        code: 'DUTY_WATCH',
        weekStartDate: '2026-03-02',
      }),
      assignments: [
        {
          ...createAssignmentEntity({
            id: 'dw-assignment',
            memberId: 'member-1',
            status: 'assigned',
          }),
          dutyPosition: {
            id: 'position-1',
            code: 'SWK',
            name: 'Senior Watch Keeper',
          },
        },
      ],
    })
    repositoryMock.findMemberDutyAssignmentsBetween.mockResolvedValue([
      {
        weekStartDate: new Date('2026-03-02T00:00:00.000Z'),
        dutyRoleCode: 'DDS',
        status: 'confirmed',
      },
      {
        weekStartDate: new Date('2026-03-09T00:00:00.000Z'),
        dutyRoleCode: 'DUTY_WATCH',
        status: 'assigned',
      },
      {
        weekStartDate: new Date('2026-03-16T00:00:00.000Z'),
        dutyRoleCode: 'DDS',
        status: 'assigned',
      },
    ])

    const service = createServiceWithRepositoryMock()
    const summary = await service.getMemberAssignmentSummary('member-1')

    expect(summary).toEqual({
      memberId: 'member-1',
      isDdsToday: true,
      isDutyWatchToday: true,
      upcomingDdsWeeks: ['2026-03-16'],
      upcomingDutyWatchWeeks: ['2026-03-09'],
    })
    expect(repositoryMock.findMemberDutyAssignmentsBetween).toHaveBeenCalledTimes(1)
    expect(repositoryMock.findMemberDutyAssignmentsBetween).toHaveBeenCalledWith(
      'member-1',
      expect.any(Date),
      expect.any(Date)
    )
  })
})
