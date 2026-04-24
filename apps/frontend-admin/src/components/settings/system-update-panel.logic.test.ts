import { describe, expect, it } from 'vitest'
import type {
  SystemStatusResponse,
  SystemUpdateJob,
  SystemUpdateStatusResponse,
} from '@sentinel/contracts'
import {
  getSystemHealthKpi,
  getPreferredUpdateTargetVersion,
  getRetryableTargetVersion,
  getSystemUpdateTraceDisplay,
  getSystemUpdatePhaseProgress,
  getSystemUpdateResultAlertKey,
  getSystemUpdateStatusAlertView,
  getUpdateHeroView,
  getUpdateTimelineItems,
  hasHotspotWarning,
  isSystemUpdateJobTerminal,
  shouldAutoOpenSystemUpdateTraceLog,
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

function createSystemStatus(overrides?: Partial<SystemStatusResponse>): SystemStatusResponse {
  return {
    overall: {
      status: 'healthy',
      label: 'Healthy',
    },
    backend: {
      status: 'healthy',
      environment: 'test',
      version: 'v2.6.8',
      uptimeSeconds: 120,
      serviceTimestamp: '2026-04-23T10:35:00Z',
    },
    database: {
      healthy: true,
      address: '127.0.0.1',
    },
    network: {
      status: 'healthy',
      telemetryAvailable: true,
      telemetryAgeSeconds: 3,
      message: 'Network checks are healthy.',
      issueCode: 'none',
      wifiConnected: true,
      currentSsid: 'Sentinel',
      hostIpAddress: '192.168.50.1',
      hotspotProfilePresent: true,
      hotspotAdapterApproved: true,
      scanAdapterPresent: true,
      hotspotDevice: 'wlan1',
      hotspotSsid: 'Sentinel',
      hotspotScanDevice: 'wlan2',
      hotspotSsidVisibleFromLaptop: true,
      approvedSsids: ['Sentinel'],
      approvedSsid: true,
      internetReachable: true,
      remoteTarget: null,
      remoteReachable: null,
      portalRecoveryLikely: null,
      generatedAt: '2026-04-23T10:35:00Z',
    },
    remoteSystems: {
      status: 'healthy',
      activeCount: 0,
      staleThresholdSeconds: 60,
      overflowCount: 0,
      sessions: [],
    },
    lastCheckedAt: '2026-04-23T10:35:01Z',
    ...overrides,
  }
}

describe('system-update-panel logic', () => {
  it('prefers the latest known release when it is available', () => {
    const targetVersion = getPreferredUpdateTargetVersion(createStatus(), createJob())

    expect(targetVersion).toBe('v2.6.8')
  })

  it('does not offer the latest release when it matches the installed version', () => {
    const targetVersion = getPreferredUpdateTargetVersion(
      createStatus({ currentVersion: 'v2.6.8', latestVersion: 'v2.6.8' }),
      null
    )

    expect(targetVersion).toBeNull()
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

  it('shows a completed result alert until that job result is dismissed', () => {
    const job = createJob({
      status: 'completed',
      step: 'completed',
      message: 'Sentinel updated successfully',
      currentVersion: 'v2.6.8',
      targetVersion: 'v2.6.8',
      phase: {
        key: 'verify_and_finalize',
        label: 'Verify and finalize',
        description: 'Run health checks and final appliance recovery tasks.',
        kind: 'primary',
        order: 5,
        total: 5,
      },
      checkpoint: {
        key: 'update_completed',
        label: 'Update completed',
        detail: 'Sentinel updated successfully.',
      },
      failureSummary: null,
    })
    const alertKey = getSystemUpdateResultAlertKey(job)

    expect(
      getSystemUpdateStatusAlertView({
        job,
        updateAvailable: false,
        latestVersion: 'v2.6.8',
        dismissedResultAlertKeys: new Set(),
      })
    ).toMatchObject({
      tone: 'success',
      heading: 'Sentinel updated to v2.6.8',
      dismissKey: alertKey,
    })

    expect(
      getSystemUpdateStatusAlertView({
        job,
        updateAvailable: false,
        latestVersion: 'v2.6.8',
        dismissedResultAlertKeys: new Set([alertKey]),
      })
    ).toBeNull()
  })

  it('shows failed and rollback result alerts until dismissed', () => {
    const failedJob = createJob()
    const rollbackJob = createJob({
      status: 'rolled_back',
      step: 'rolled_back',
      message: 'Sentinel rolled back to the previous release',
      rollbackAttempted: true,
    })

    expect(
      getSystemUpdateStatusAlertView({
        job: failedJob,
        updateAvailable: false,
        latestVersion: null,
        dismissedResultAlertKeys: new Set(),
      })
    ).toMatchObject({
      tone: 'error',
      heading: 'Update v2.6.7 failed',
      dismissKey: getSystemUpdateResultAlertKey(failedJob),
    })

    expect(
      getSystemUpdateStatusAlertView({
        job: rollbackJob,
        updateAvailable: false,
        latestVersion: null,
        dismissedResultAlertKeys: new Set(),
      })
    ).toMatchObject({
      tone: 'warning',
      heading: 'Update v2.6.7 rolled back',
      dismissKey: getSystemUpdateResultAlertKey(rollbackJob),
    })
  })

  it('keeps active jobs visible and auto-opens trace diagnostics', () => {
    const job = createJob({
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
    })

    expect(
      getSystemUpdateStatusAlertView({
        job,
        updateAvailable: false,
        latestVersion: 'v2.6.7',
        dismissedResultAlertKeys: new Set(['ignored']),
      })
    ).toMatchObject({
      tone: 'info',
      heading: 'Updating to v2.6.7',
      dismissKey: null,
    })
    expect(shouldAutoOpenSystemUpdateTraceLog(job)).toBe(true)
  })

  it('does not show a status alert when the appliance is current and idle', () => {
    expect(
      getSystemUpdateStatusAlertView({
        job: null,
        updateAvailable: false,
        latestVersion: 'v2.6.8',
        dismissedResultAlertKeys: new Set(),
      })
    ).toBeNull()
  })

  it('builds hero copy for current, available, running, and failed states', () => {
    expect(
      getUpdateHeroView({
        status: {
          currentVersion: 'v2.6.8',
          latestVersion: 'v2.6.8',
          updateAvailable: false,
          currentJob: null,
        },
      })
    ).toMatchObject({
      tone: 'success',
      headline: 'Sentinel is up to date',
      badge: 'Current',
    })

    expect(
      getUpdateHeroView({
        status: {
          currentVersion: 'v2.6.6',
          latestVersion: 'v2.6.8',
          updateAvailable: true,
          currentJob: null,
        },
      })
    ).toMatchObject({
      tone: 'info',
      headline: 'A newer Sentinel release is available',
      badge: 'Update available',
    })

    expect(
      getUpdateHeroView({
        status: {
          currentVersion: 'v2.6.6',
          latestVersion: 'v2.6.8',
          updateAvailable: false,
          currentJob: createJob({
            status: 'installing',
            step: 'installing',
            finishedAt: null,
            phase: {
              key: 'install_release',
              label: 'Install release',
              description: 'Download, verify, and install the requested Sentinel package.',
              kind: 'primary',
              order: 3,
              total: 5,
            },
          }),
        },
      })
    ).toMatchObject({
      tone: 'info',
      headline: 'Updating to v2.6.7',
      badge: 'Install release',
    })

    expect(
      getUpdateHeroView({
        status: {
          currentVersion: 'v2.6.6',
          latestVersion: null,
          updateAvailable: false,
          currentJob: createJob(),
        },
      })
    ).toMatchObject({
      tone: 'error',
      headline: 'Update v2.6.7 failed',
      badge: 'Attention required',
    })
  })

  it('maps system health and hotspot warnings into secondary views', () => {
    expect(
      getSystemHealthKpi({
        systemStatus: createSystemStatus(),
        isLoading: false,
        isError: false,
      })
    ).toMatchObject({
      tone: 'success',
      value: 'Healthy',
    })

    const warningStatus = createSystemStatus({
      overall: {
        status: 'warning',
        label: 'Attention needed',
      },
      network: {
        ...createSystemStatus().network,
        status: 'warning',
        issueCode: 'hotspot_profile_missing',
        message: 'The host server is missing the managed hotspot profile.',
      },
    })

    expect(hasHotspotWarning(warningStatus)).toBe(true)
    expect(
      getSystemHealthKpi({
        systemStatus: warningStatus,
        isLoading: false,
        isError: false,
      })
    ).toMatchObject({
      tone: 'warning',
      value: 'Attention needed',
    })
  })

  it('builds a capped operator timeline with hotspot warning as secondary context', () => {
    const job = createJob({
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
    })
    const phaseProgress = getSystemUpdatePhaseProgress(job)
    const warningStatus = createSystemStatus({
      network: {
        ...createSystemStatus().network,
        status: 'warning',
        issueCode: 'hotspot_not_visible',
        message: 'Sentinel cannot see the approved hotspot from the scan radio yet.',
      },
    })

    const items = getUpdateTimelineItems({
      currentJob: job,
      phaseProgress,
      systemStatus: warningStatus,
    })

    expect(items.length).toBeLessThanOrEqual(5)
    expect(items.map((item) => item.key)).toContain('requested')
    expect(items.map((item) => item.key)).toContain('active-checkpoint')
    expect(items.at(-1)).toMatchObject({
      key: 'hotspot-warning',
      tone: 'warning',
    })
  })

  it('filters repetitive Docker download and extract progress from displayed trace content', () => {
    const display = getSystemUpdateTraceDisplay(
      [
        '2026-04-23T21:12:17Z [updater] [INFO] Starting image pull',
        '2026-04-23T21:12:18Z [updater] [INFO] stderr: 4a3fb8418c1c Downloading 269.5MB',
        '2026-04-23T21:12:18Z [updater] [INFO] stderr: b7f38b8c1e02 Downloading 266.3MB',
        '2026-04-23T21:12:18Z [updater] [INFO] stderr: 9e99b90e1d8b Extracting 1B',
        '2026-04-23T21:12:18Z [updater] [INFO] stderr: 59052e5c5020 Pulling fs layer 0B',
        '2026-04-23T21:12:18Z [updater] [INFO] stderr: 6a942e7e5a70 Download complete 0B',
        '2026-04-23T21:12:18Z [updater] [INFO] stderr: 05e1d2ac12b3 Pull complete 0B',
        '2026-04-23T21:12:19Z [updater] [INFO] Verifying compose stack',
      ].join('\n')
    )

    expect(display.filteredProgressLineCount).toBe(6)
    expect(display.displayedLineCount).toBe(2)
    expect(display.content).toContain('Starting image pull')
    expect(display.content).toContain('Verifying compose stack')
    expect(display.content).not.toContain('Downloading 269.5MB')
    expect(display.content).not.toContain('Extracting 1B')
    expect(display.content).not.toContain('Pulling fs layer 0B')
    expect(display.content).not.toContain('Download complete 0B')
    expect(display.content).not.toContain('Pull complete 0B')
    expect(display.rows.map((row) => row.message)).toEqual([
      'Starting image pull',
      'Verifying compose stack',
    ])
  })

  it('does not filter meaningful trace lines that mention downloading without Docker progress format', () => {
    const display = getSystemUpdateTraceDisplay(
      [
        '2026-04-23T21:12:17Z [updater] [INFO] Downloading release metadata',
        '2026-04-23T21:12:18Z [updater] [INFO] Extracting release archive into staging',
      ].join('\n')
    )

    expect(display.filteredProgressLineCount).toBe(0)
    expect(display.displayedLineCount).toBe(2)
  })

  it('parses displayed trace lines into severity rows and summary events', () => {
    const display = getSystemUpdateTraceDisplay(
      [
        '2026-04-23T21:13:11Z [updater] [INFO] stdout: Database healthy',
        '2026-04-23T21:13:12Z [updater] [WARNING] Shared hotspot recovery degraded after update',
        '2026-04-23T21:13:13Z [updater] [ERROR] Health check failed',
        '2026-04-23T21:13:14Z [updater] [INFO] Job completed successfully',
      ].join('\n')
    )

    expect(display.severityCounts).toMatchObject({
      success: 2,
      warning: 1,
      error: 1,
      info: 0,
    })
    expect(display.rows.map((row) => row.severity)).toEqual([
      'success',
      'warning',
      'error',
      'success',
    ])
    expect(display.summaryItems.map((item) => item.title)).toContain(
      'Shared hotspot recovery degraded after update'
    )
  })

  it('compacts reading database progress down to the final line in the displayed trace', () => {
    const display = getSystemUpdateTraceDisplay(
      [
        '2026-04-23T21:10:44Z [updater] [INFO] Preparing packages',
        '2026-04-23T21:10:45Z [updater] [INFO] stdout: (Reading database ...',
        '2026-04-23T21:10:45Z [updater] [INFO] stdout: (Reading database ... 5%',
        '2026-04-23T21:10:45Z [updater] [INFO] stdout: (Reading database ... 10%',
        '2026-04-23T21:10:45Z [updater] [INFO] stdout: (Reading database ... 208696 files and directories currently installed.)',
        '2026-04-23T21:10:46Z [updater] [INFO] Installing package',
      ].join('\n')
    )

    expect(display.filteredProgressLineCount).toBe(3)
    expect(display.displayedLineCount).toBe(3)
    expect(display.content).toContain('Preparing packages')
    expect(display.content).toContain(
      'Reading database ... 208696 files and directories currently installed.'
    )
    expect(display.content).toContain('Installing package')
    expect(display.content).not.toContain('Reading database ... 5%')
    expect(display.content).not.toContain('Reading database ... 10%')
  })
})
