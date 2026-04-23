import { describe, expect, it } from 'vitest'
import type { SystemUpdateJob, SystemUpdateStatusResponse } from '@sentinel/contracts'
import {
  getPreferredUpdateTargetVersion,
  getRetryableTargetVersion,
} from './system-update-panel.logic'

function createJob(overrides?: Partial<SystemUpdateJob>): SystemUpdateJob {
  return {
    jobId: 'system-update-1776956219166-5526cce8-8dc0-4e25-b3d3-15fc7edf398c',
    status: 'failed',
    step: 'failed',
    message: 'Update failed',
    requestedAt: '2026-04-23T10:33:21Z',
    startedAt: '2026-04-23T10:33:25Z',
    finishedAt: '2026-04-23T10:33:40Z',
    currentVersion: 'v2.6.6',
    latestVersion: null,
    targetVersion: 'v2.6.7',
    failureSummary: 'Release metadata request failed with HTTP 403',
    rollbackAttempted: false,
    requestedBy: {
      memberId: 'member-1',
      memberName: 'MS Courtney Sauk',
      accountLevel: 5,
      fromIp: '127.0.0.1',
    },
    ...overrides,
  }
}

function createStatus(
  overrides?: Partial<Pick<SystemUpdateStatusResponse, 'currentVersion' | 'latestVersion'>>
): Pick<SystemUpdateStatusResponse, 'currentVersion' | 'latestVersion'> {
  return {
    currentVersion: 'v2.6.6',
    latestVersion: 'v2.6.8',
    ...overrides,
  }
}

describe('system-update-panel logic', () => {
  it('prefers the latest known release when it is available', () => {
    const targetVersion = getPreferredUpdateTargetVersion(createStatus(), createJob())

    expect(targetVersion).toBe('v2.6.8')
  })

  it('retries the last failed target when latest lookup is unavailable', () => {
    const targetVersion = getPreferredUpdateTargetVersion(
      createStatus({ latestVersion: null }),
      createJob()
    )

    expect(targetVersion).toBe('v2.6.7')
  })

  it('does not retry a failed target that is not newer than the installed version', () => {
    const targetVersion = getRetryableTargetVersion(
      createJob({ targetVersion: 'v2.6.6' }),
      'v2.6.6'
    )

    expect(targetVersion).toBeNull()
  })
})
