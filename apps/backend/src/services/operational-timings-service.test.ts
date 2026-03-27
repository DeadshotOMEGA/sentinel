import { LegacyOperationalTimingsSettingsSchema } from '@sentinel/contracts'
import type { PrismaClientInstance } from '@sentinel/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalTimingsService } from './operational-timings-service.js'
import {
  applyOperationalTimingsRuntimeState,
  DEFAULT_BACKEND_TIMEZONE,
  getDefaultOperationalTimingsSettings,
  getOperationalTimingsRuntimeState,
} from '../lib/operational-timings-runtime.js'

vi.mock('../jobs/index.js', () => ({
  isJobSchedulerRunning: vi.fn(),
  reconfigureJobScheduler: vi.fn(),
  updateJobConfig: vi.fn(),
}))

import { isJobSchedulerRunning, reconfigureJobScheduler, updateJobConfig } from '../jobs/index.js'

interface RepositoryMock {
  findStoredSetting: ReturnType<typeof vi.fn>
  findLegacyStoredSetting: ReturnType<typeof vi.fn>
  upsertStoredSetting: ReturnType<typeof vi.fn>
  findDdsTemplateSetting: ReturnType<typeof vi.fn>
  upsertDdsTemplateSetting: ReturnType<typeof vi.fn>
}

function createRepositoryMock(): RepositoryMock {
  return {
    findStoredSetting: vi.fn(),
    findLegacyStoredSetting: vi.fn(),
    upsertStoredSetting: vi.fn(),
    findDdsTemplateSetting: vi.fn(),
    upsertDdsTemplateSetting: vi.fn(),
  }
}

describe('OperationalTimingsService runtime apply behavior', () => {
  let repositoryMock: RepositoryMock

  beforeEach(() => {
    repositoryMock = createRepositoryMock()
    vi.mocked(isJobSchedulerRunning).mockReset()
    vi.mocked(reconfigureJobScheduler).mockReset()
    vi.mocked(updateJobConfig).mockReset()

    applyOperationalTimingsRuntimeState({
      settings: getDefaultOperationalTimingsSettings(),
      source: 'default',
      updatedAt: null,
    })
  })

  function createServiceWithRepositoryMock(): OperationalTimingsService {
    const service = new OperationalTimingsService({} as PrismaClientInstance)
    ;(service as unknown as { repository: RepositoryMock }).repository = repositoryMock
    return service
  }

  it('reconfigures scheduler immediately when running', async () => {
    vi.mocked(isJobSchedulerRunning).mockReturnValue(true)

    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dayRolloverTime = '03:30'
    settings.operational.lockupWarningTime = '21:15'
    settings.operational.lockupCriticalTime = '22:20'
    settings.operational.dutyWatchRules = [
      {
        id: 'rule-mon',
        name: 'Monday Duty Watch',
        effectiveStartDate: '2026-03-02',
        startTime: '18:45',
        endTime: '20:00',
        recurrence: { type: 'weekly', weekday: 1, intervalWeeks: 1 },
      },
      {
        id: 'rule-fri',
        name: 'Friday Duty Watch',
        effectiveStartDate: '2026-03-06',
        startTime: '18:45',
        endTime: '20:00',
        recurrence: { type: 'weekly', weekday: 5, intervalWeeks: 1 },
      },
    ]

    const updatedAt = new Date('2026-03-06T13:00:00.000Z')
    repositoryMock.upsertStoredSetting.mockResolvedValue({ updatedAt })
    repositoryMock.findDdsTemplateSetting.mockResolvedValue(null)

    const service = createServiceWithRepositoryMock()
    await service.updateOperationalTimings(settings)

    expect(vi.mocked(reconfigureJobScheduler)).toHaveBeenCalledWith({
      timezone: DEFAULT_BACKEND_TIMEZONE,
      dayRolloverTime: '03:30',
      lockupWarningTime: '21:15',
      lockupCriticalTime: '22:20',
      dutyWatchRules: settings.operational.dutyWatchRules,
    })
    expect(vi.mocked(updateJobConfig)).not.toHaveBeenCalled()

    const runtime = getOperationalTimingsRuntimeState()
    expect(runtime.settings.operational.dayRolloverTime).toBe('03:30')
    expect(runtime.settings.operational.dutyWatchRules).toEqual(settings.operational.dutyWatchRules)
    expect(runtime.source).toBe('stored')
    expect(runtime.updatedAt?.toISOString()).toBe(updatedAt.toISOString())
  })

  it('updates job config when scheduler is not running', async () => {
    vi.mocked(isJobSchedulerRunning).mockReturnValue(false)

    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dayRolloverTime = '04:10'
    settings.operational.dutyWatchRules = [
      {
        id: 'rule-monthly',
        name: 'First Tuesday Event',
        effectiveStartDate: '2026-03-03',
        startTime: '19:00',
        endTime: '21:00',
        recurrence: { type: 'monthly_nth_weekday', weekday: 2, ordinal: 'first' },
      },
    ]

    repositoryMock.upsertStoredSetting.mockResolvedValue({
      updatedAt: new Date('2026-03-06T13:10:00.000Z'),
    })
    repositoryMock.findDdsTemplateSetting.mockResolvedValue(null)

    const service = createServiceWithRepositoryMock()
    await service.updateOperationalTimings(settings)

    expect(vi.mocked(reconfigureJobScheduler)).not.toHaveBeenCalled()
    expect(vi.mocked(updateJobConfig)).toHaveBeenCalledWith({
      timezone: DEFAULT_BACKEND_TIMEZONE,
      dayRolloverTime: '04:10',
      lockupWarningTime: settings.operational.lockupWarningTime,
      lockupCriticalTime: settings.operational.lockupCriticalTime,
      dutyWatchRules: settings.operational.dutyWatchRules,
    })
  })

  it('migrates legacy v1 settings into v2 duty watch rules', async () => {
    const legacySettings = {
      operational: {
        dayRolloverTime: '03:00',
        lockupWarningTime: '22:00',
        lockupCriticalTime: '23:00',
        dutyWatchAlertTime: '18:30',
        dutyWatchDays: [2, 4],
      },
      workingHours: getDefaultOperationalTimingsSettings().workingHours,
      alertRateLimits: getDefaultOperationalTimingsSettings().alertRateLimits,
    }

    expect(LegacyOperationalTimingsSettingsSchema).toBeDefined()
    repositoryMock.findStoredSetting.mockResolvedValue(null)
    repositoryMock.findLegacyStoredSetting.mockResolvedValue({
      value: legacySettings,
      updatedAt: new Date('2026-03-07T15:00:00.000Z'),
    })
    repositoryMock.upsertStoredSetting.mockResolvedValue({
      updatedAt: new Date('2026-03-07T15:05:00.000Z'),
    })

    const service = createServiceWithRepositoryMock()
    const response = await service.getOperationalTimings()

    expect(response.settings.operational.dutyWatchRules).toEqual([
      {
        id: 'legacy-duty-watch-2',
        name: 'Duty Watch',
        effectiveStartDate: '2026-01-06',
        startTime: '18:30',
        endTime: '18:30',
        recurrence: { type: 'weekly', weekday: 2, intervalWeeks: 1 },
      },
      {
        id: 'legacy-duty-watch-4',
        name: 'Duty Watch',
        effectiveStartDate: '2026-01-08',
        startTime: '18:30',
        endTime: '18:30',
        recurrence: { type: 'weekly', weekday: 4, intervalWeeks: 1 },
      },
    ])
    expect(repositoryMock.upsertStoredSetting).toHaveBeenCalledWith(response.settings)
  })
})
