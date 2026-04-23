import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemUpdateStatusService } from './system-update-status-service.js'

describe('SystemUpdateStatusService', () => {
  const tempDirs: string[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-23T15:35:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.unstubAllGlobals()

    await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
  })

  async function createService() {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-status-'))
    tempDirs.push(stateRoot)

    return new SystemUpdateStatusService({
      stateRoot,
      applianceStatePath: join(stateRoot, 'missing-appliance-state.json'),
      releaseRepository: 'DeadshotOMEGA/sentinel',
      latestReleaseCacheTtlMs: 5 * 60 * 1000,
      latestReleaseErrorCacheTtlMs: 60 * 1000,
    })
  }

  it('caches successful latest release lookups between status polls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new globalThis.Response(
        JSON.stringify({
          tag_name: 'v2.6.7',
          html_url: 'https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.6.7',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const service = await createService()

    const firstStatus = await service.getStatus()
    const secondStatus = await service.getStatus()

    expect(firstStatus.latestVersion).toBe('v2.6.7')
    expect(secondStatus.latestVersion).toBe('v2.6.7')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1)
    await service.getStatus()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('caches rate-limited latest release failures until the GitHub reset window passes', async () => {
    const rateLimitResetSeconds = Math.floor(Date.now() / 1000) + 120
    const fetchMock = vi.fn().mockResolvedValue(
      new globalThis.Response('API rate limit exceeded', {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(rateLimitResetSeconds),
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const service = await createService()

    const firstStatus = await service.getStatus()
    const secondStatus = await service.getStatus()

    expect(firstStatus.latestVersion).toBeNull()
    expect(secondStatus.latestVersion).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60 * 1000)
    await service.getStatus()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(61 * 1000)
    await service.getStatus()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
