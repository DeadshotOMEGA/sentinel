import type { SystemStatusResponse, SystemUpdateStatusResponse } from '@sentinel/contracts'
import { describe, expect, it } from 'vitest'
import { getAdminRecentIssues } from './admin-issues'

function createSystemStatus(overrides?: Partial<SystemStatusResponse>): SystemStatusResponse {
  return {
    overall: { status: 'healthy', label: 'Healthy' },
    backend: {
      status: 'healthy',
      environment: 'test',
      version: 'v2.8.2',
      uptimeSeconds: 10,
      serviceTimestamp: '2026-04-24T12:00:00.000Z',
    },
    database: {
      healthy: true,
      address: 'localhost:5432',
    },
    network: {
      status: 'healthy',
      telemetryAvailable: true,
      telemetryAgeSeconds: 2,
      message: 'Network checks are healthy.',
      issueCode: 'none',
      wifiConnected: true,
      currentSsid: 'Sentinel',
      hostIpAddress: '192.168.1.10',
      hotspotProfilePresent: true,
      hotspotAdapterApproved: true,
      scanAdapterPresent: true,
      hotspotDevice: 'wlan0',
      hotspotSsid: 'Sentinel-Setup',
      hotspotScanDevice: 'wlan1',
      hotspotSsidVisibleFromLaptop: true,
      approvedSsids: ['Sentinel'],
      approvedSsid: true,
      internetReachable: true,
      remoteTarget: null,
      remoteReachable: null,
      portalRecoveryLikely: false,
      generatedAt: '2026-04-24T12:00:00.000Z',
    },
    remoteSystems: {
      status: 'unknown',
      activeCount: 0,
      staleThresholdSeconds: 120,
      overflowCount: 0,
      sessions: [],
    },
    lastCheckedAt: '2026-04-24T12:00:00.000Z',
    ...overrides,
  }
}

function createUpdateStatus(
  overrides?: Partial<SystemUpdateStatusResponse>
): SystemUpdateStatusResponse {
  return {
    currentVersion: 'v2.8.2',
    latestVersion: 'v2.8.2',
    latestReleaseUrl: null,
    latestReleaseNotes: null,
    updateAvailable: false,
    currentJob: null,
    ...overrides,
  }
}

describe('getAdminRecentIssues', () => {
  it('does not treat neutral badge inventory as a recent issue', () => {
    const issues = getAdminRecentIssues({
      systemStatus: createSystemStatus({
        overall: { status: 'error', label: 'Database unavailable' },
        database: { healthy: false, address: 'localhost:5432' },
      }),
      systemStatusError: false,
      updateStatus: createUpdateStatus(),
      updateStatusError: false,
    })

    expect(issues[0]?.id).toBe('database-unhealthy')
    expect(issues[0]?.href).toBe('/admin/database')
    expect(issues.some((issue) => issue.routeId === 'badges')).toBe(false)
  })

  it('links update availability directly to updates', () => {
    const issues = getAdminRecentIssues({
      systemStatus: createSystemStatus(),
      systemStatusError: false,
      updateStatus: createUpdateStatus({
        latestVersion: 'v2.8.3',
        updateAvailable: true,
      }),
      updateStatusError: false,
    })

    expect(issues[0]).toMatchObject({
      id: 'update-available',
      href: '/admin/updates',
      routeId: 'updates',
    })
  })
})
