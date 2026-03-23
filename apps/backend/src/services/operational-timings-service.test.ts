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
  upsertStoredSetting: ReturnType<typeof vi.fn>
  findDdsTemplateSetting: ReturnType<typeof vi.fn>
  upsertDdsTemplateSetting: ReturnType<typeof vi.fn>
}

function createRepositoryMock(): RepositoryMock {
  return {
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
    settings.operational.dutyWatchAlertTime = '18:45'
    settings.operational.lockupWarningTime = '21:15'
    settings.operational.lockupCriticalTime = '22:20'
    settings.operational.dutyWatchDays = [1, 3, 5]

    const updatedAt = new Date('2026-03-06T13:00:00.000Z')
    repositoryMock.upsertStoredSetting.mockResolvedValue({ updatedAt })
    repositoryMock.findDdsTemplateSetting.mockResolvedValue(null)

    const service = createServiceWithRepositoryMock()
    await service.updateOperationalTimings(settings)

    expect(vi.mocked(reconfigureJobScheduler)).toHaveBeenCalledWith({
      timezone: DEFAULT_BACKEND_TIMEZONE,
      dayRolloverTime: '03:30',
      dutyWatchAlertTime: '18:45',
      lockupWarningTime: '21:15',
      lockupCriticalTime: '22:20',
      dutyWatchDays: [1, 3, 5],
    })
    expect(vi.mocked(updateJobConfig)).not.toHaveBeenCalled()

    const runtime = getOperationalTimingsRuntimeState()
    expect(runtime.settings.operational.dayRolloverTime).toBe('03:30')
    expect(runtime.settings.operational.dutyWatchDays).toEqual([1, 3, 5])
    expect(runtime.source).toBe('stored')
    expect(runtime.updatedAt?.toISOString()).toBe(updatedAt.toISOString())
  })

  it('updates job config when scheduler is not running', async () => {
    vi.mocked(isJobSchedulerRunning).mockReturnValue(false)

    const settings = getDefaultOperationalTimingsSettings()
    settings.operational.dayRolloverTime = '04:10'
    settings.operational.dutyWatchDays = [2, 4, 6]

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
      dutyWatchAlertTime: settings.operational.dutyWatchAlertTime,
      lockupWarningTime: settings.operational.lockupWarningTime,
      lockupCriticalTime: settings.operational.lockupCriticalTime,
      dutyWatchDays: [2, 4, 6],
    })
  })
})
