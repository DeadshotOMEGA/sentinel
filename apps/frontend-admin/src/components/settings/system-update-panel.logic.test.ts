import { describe, expect, it } from 'vitest'
import type { SystemUpdateJob, SystemUpdateStatusResponse } from '@sentinel/contracts'
import {
  getPreferredUpdateTargetVersion,
  getRetryableTargetVersion,
  getSystemUpdatePhaseProgress,
  isSystemUpdateJobTerminal,
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
    phase: {
      key: 'recovery',
      label: 'Recovery',
      description: 'Attempt rollback or point the operator to restore guidance.',
      kind: 'recovery',
      order: 5,
      total: 5,
    },
    checkpoint: {
      key: 'update_failed',
      label: 'Update failed',
      detail: 'The update stopped and needs operator attention before retrying.',
    },
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

  it('marks rollback_attempted as active until it has a finished timestamp', () => {
    expect(
      isSystemUpdateJobTerminal(
        createJob({
          status: 'rollback_attempted',
          step: 'rollback_attempted',
          finishedAt: null,
        })
      )
    ).toBe(false)

    expect(
      isSystemUpdateJobTerminal(
        createJob({
          status: 'rollback_attempted',
          step: 'rollback_attempted',
          finishedAt: '2026-04-23T10:33:40Z',
        })
      )
    ).toBe(true)
  })

  it('builds phase progress from updater-owned phase and checkpoint fields', () => {
    const phases = getSystemUpdatePhaseProgress(
      createJob({
        status: 'health_check',
        step: 'health_check',
        finishedAt: null,
        phase: {
          key: 'verify_and_finalize',
          label: 'Verify and finalize',
          description: 'Run health checks and final appliance recovery tasks.',
          kind: 'primary',
          order: 5,
          total: 5,
        },
        checkpoint: {
          key: 'recovering_hotspot',
          label: 'Checking hotspot recovery',
          detail: 'Checking hosted hotspot recovery.',
        },
      })
    )

    expect(phases.map((phase) => phase.state)).toEqual([
      'complete',
      'complete',
      'complete',
      'complete',
      'active',
    ])
    expect(phases[4]?.caption).toBe('Checking hosted hotspot recovery.')
  })
})
