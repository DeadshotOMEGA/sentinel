import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
          name: 'Sentinel v2.6.7',
          html_url: 'https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.6.7',
          published_at: '2026-04-23T14:00:00.000Z',
          body: '## Changelog\n\n- Added offline release notes.',
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
    expect(firstStatus.latestReleaseNotes).toMatchObject({
      version: 'v2.6.7',
      title: 'Sentinel v2.6.7',
      body: '## Changelog\n\n- Added offline release notes.',
      cachedAt: '2026-04-23T15:35:00.000Z',
    })
    expect(secondStatus.latestVersion).toBe('v2.6.7')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1)
    await service.getStatus()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('persists release notes and serves them when later release lookups fail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new globalThis.Response(
          JSON.stringify({
            tag_name: 'v2.6.7',
            name: 'Sentinel v2.6.7',
            html_url: 'https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.6.7',
            published_at: '2026-04-23T14:00:00.000Z',
            body: '## Release notes\n\nCached for appliance operators.',
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          }
        )
      )
      .mockRejectedValueOnce(new Error('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    const service = await createService()

    const onlineStatus = await service.getStatus()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1)
    const offlineStatus = await service.getStatus()

    expect(onlineStatus.latestReleaseNotes?.body).toContain('Cached for appliance operators.')
    expect(offlineStatus.latestVersion).toBeNull()
    expect(offlineStatus.latestReleaseNotes).toMatchObject({
      version: 'v2.6.7',
      title: 'Sentinel v2.6.7',
      body: '## Release notes\n\nCached for appliance operators.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('serves a cached release notes file when online lookup is disabled', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'sentinel-system-update-status-'))
    tempDirs.push(stateRoot)
    const service = new SystemUpdateStatusService({
      stateRoot,
      applianceStatePath: join(stateRoot, 'missing-appliance-state.json'),
      releaseRepository: 'DeadshotOMEGA/sentinel',
      latestReleaseCacheTtlMs: 5 * 60 * 1000,
      latestReleaseErrorCacheTtlMs: 60 * 1000,
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new globalThis.Response(
        JSON.stringify({
          tag_name: 'v2.6.9',
          name: 'Sentinel v2.6.9',
          html_url: 'https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.6.9',
          published_at: '2026-04-23T14:00:00.000Z',
          body: 'Stored release notes.',
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await service.getStatus()
    const cacheText = await readFile(join(stateRoot, 'release-notes-cache.json'), 'utf-8')

    expect(cacheText).toContain('Stored release notes.')
  })

  it('bypasses the successful release cache when force refresh is requested', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
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
      .mockResolvedValueOnce(
        new globalThis.Response(
          JSON.stringify({
            tag_name: 'v2.6.8',
            html_url: 'https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.6.8',
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
    const refreshedStatus = await service.getStatus({ forceRefresh: true })

    expect(firstStatus.latestVersion).toBe('v2.6.7')
    expect(refreshedStatus.latestVersion).toBe('v2.6.8')
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
