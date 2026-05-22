import type { HostHotspotRecoveryStatus, SystemStatusResponse } from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'
import {
  formatRecoveryTime,
  getRecoveryElapsedSeconds,
  getRecoveryEstimateSeconds,
  getRecoveryProgressPercent,
  getRecoveryRemainingSeconds,
  isAutomatedHotspotRecoveryActive,
  isAutomatedHotspotRecoveryComplete,
} from './automated-hotspot-recovery-notice.logic'

function createRecoveryStatus(
  overrides?: Partial<HostHotspotRecoveryStatus>
): HostHotspotRecoveryStatus {
  return {
    state: 'running',
    stage: 'resetting_usb',
    message: 'Automated repair is running.',
    requestId: 'request-1',
    source: 'host-hotspot-monitor',
    connectionName: null,
    hotspotSsid: 'Stone Frigate',
    hotspotDevice: 'wlan-ap',
    scanDevice: 'wlan-scan',
    usbDevice: '1-4',
    hardwareResetApplied: false,
    startedAt: '2026-05-22T12:00:00.000Z',
    updatedAt: '2026-05-22T12:00:10.000Z',
    completedAt: null,
    durationSeconds: null,
    estimatedDurationSeconds: 40,
    ...overrides,
  }
}

function createSystemStatus(
  recoveryStatus: HostHotspotRecoveryStatus | null,
  issueCode: SystemStatusResponse['network']['issueCode'] = 'hotspot_not_visible'
): SystemStatusResponse {
  return {
    overall: { status: issueCode === 'none' ? 'healthy' : 'warning', label: 'Network attention' },
    backend: {
      status: 'healthy',
      environment: 'test',
      version: 'v0.0.0',
      uptimeSeconds: 10,
      serviceTimestamp: '2026-05-22T12:00:00.000Z',
    },
    database: { healthy: true, address: 'postgres' },
    network: {
      status: issueCode === 'none' ? 'healthy' : 'warning',
      telemetryAvailable: true,
      telemetryAgeSeconds: 1,
      message: 'Network status',
      issueCode,
      wifiConnected: true,
      currentSsid: 'GC Public',
      hostIpAddress: '10.42.0.1',
      hotspotProfilePresent: true,
      hotspotAdapterApproved: true,
      scanAdapterPresent: true,
      hotspotDevice: 'wlan-ap',
      hotspotSsid: 'Stone Frigate',
      hotspotScanDevice: 'wlan-scan',
      hotspotSsidVisibleFromLaptop: issueCode === 'none',
      hotspotAdapterBusy: false,
      internetWifiConnection: null,
      internetWifiSsid: null,
      approvedSsids: ['GC Public'],
      approvedSsid: true,
      internetReachable: true,
      remoteTarget: null,
      remoteReachable: null,
      portalRecoveryLikely: null,
      hostHotspotRecovery: recoveryStatus,
      generatedAt: '2026-05-22T12:00:10.000Z',
    },
    remoteSystems: {
      status: 'healthy',
      activeCount: 0,
      staleThresholdSeconds: 90,
      overflowCount: 0,
      sessions: [],
    },
    lastCheckedAt: '2026-05-22T12:00:10.000Z',
  }
}

describe('automated hotspot recovery notice logic', () => {
  it('identifies active automated hotspot recovery', () => {
    expect(isAutomatedHotspotRecoveryActive(createSystemStatus(createRecoveryStatus()))).toBe(true)
    expect(
      isAutomatedHotspotRecoveryActive(
        createSystemStatus(createRecoveryStatus({ source: 'frontend-admin' }))
      )
    ).toBe(false)
  })

  it('identifies completed automated recovery once network status is healthy', () => {
    expect(
      isAutomatedHotspotRecoveryComplete(
        createSystemStatus(
          createRecoveryStatus({
            state: 'completed',
            stage: 'completed',
            completedAt: '2026-05-22T12:00:35.000Z',
          }),
          'none'
        )
      )
    ).toBe(true)
  })

  it('uses historical estimates and elapsed time for remaining time', () => {
    const recoveryStatus = createRecoveryStatus({ estimatedDurationSeconds: 40 })
    const nowMs = new Date('2026-05-22T12:00:15.000Z').getTime()

    expect(getRecoveryEstimateSeconds(recoveryStatus)).toBe(40)
    expect(getRecoveryElapsedSeconds(recoveryStatus, nowMs)).toBe(15)
    expect(getRecoveryRemainingSeconds(recoveryStatus, nowMs)).toBe(25)
    expect(getRecoveryProgressPercent(recoveryStatus, nowMs)).toBe(38)
  })

  it('formats short and minute-level durations', () => {
    expect(formatRecoveryTime(42)).toBe('42s')
    expect(formatRecoveryTime(75)).toBe('1m 15s')
  })
})
