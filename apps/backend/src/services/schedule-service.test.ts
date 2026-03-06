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
}

function createRepositoryMock(): RepositoryMock {
  return {
    findScheduleById: vi.fn(),
    findDutyRoleById: vi.fn(),
    createOverride: vi.fn(),
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

describe('ScheduleService.createDwOverride configured day validation', () => {
  let repositoryMock: RepositoryMock

  beforeEach(() => {
    repositoryMock = createRepositoryMock()
    applyOperationalTimingsRuntimeState({
      settings: {
        ...getDefaultOperationalTimingsSettings(),
        operational: {
          ...getDefaultOperationalTimingsSettings().operational,
          dutyWatchDays: [1, 3, 5],
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
    ).rejects.toThrow('configured Duty Watch days')

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
