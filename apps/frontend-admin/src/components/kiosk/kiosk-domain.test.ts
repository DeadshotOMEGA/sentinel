import type { SystemStatusResponse } from '@sentinel/contracts'
import { describe, expect, it, vi } from 'vitest'
import { getKioskConnectivityBadge } from './kiosk-domain'

vi.mock('@/lib/api-client', () => ({ apiClient: {} }))

function createSystemStatus(overrides?: Partial<SystemStatusResponse>): SystemStatusResponse {
  return {
    overall: { status: 'healthy', label: 'Healthy' },
    backend: {
      status: 'healthy',
      environment: 'production',
      version: 'v3.0.1',
      uptimeSeconds: 10,
      serviceTimestamp: '2026-05-01T12:00:00.000Z',
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
      hotspotAdapterBusy: false,
      internetWifiConnection: null,
      internetWifiSsid: null,
      approvedSsids: ['Sentinel'],
      approvedSsid: true,
      internetReachable: true,
      remoteTarget: null,
      remoteReachable: null,
      portalRecoveryLikely: false,
      generatedAt: '2026-05-01T12:00:00.000Z',
    },
    remoteSystems: {
      status: 'unknown',
      activeCount: 0,
      staleThresholdSeconds: 120,
      overflowCount: 0,
      sessions: [],
    },
    lastCheckedAt: '2026-05-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('getKioskConnectivityBadge', () => {
  it('shows stale warning when refresh fails but last known status is healthy', () => {
    const badge = getKioskConnectivityBadge({
      systemStatus: createSystemStatus(),
      isLoading: false,
      isError: true,
    })

    expect(badge).toMatchObject({
      status: 'warning',
      label: 'CONNECTED (STATUS STALE)',
    })
  })

  it('shows disconnected when there is no status data and request failed', () => {
    const badge = getKioskConnectivityBadge({
      systemStatus: null,
      isLoading: false,
      isError: true,
    })

    expect(badge).toMatchObject({
      status: 'error',
      label: 'DISCONNECTED',
    })
  })

  it('does not treat the host internet Wi-Fi SSID as the kiosk Wi-Fi status', () => {
    const badge = getKioskConnectivityBadge({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          status: 'warning',
          issueCode: 'unapproved_ssid',
          currentSsid: 'Coffee-Shop',
          approvedSsids: ['GC Public'],
          approvedSsid: false,
          message: 'Connected to an unapproved internet Wi-Fi SSID',
        },
      }),
      isLoading: false,
      isError: false,
    })

    expect(badge).toMatchObject({
      status: 'success',
      label: 'CONNECTED',
    })
  })

  it('surfaces host hotspot warnings without saying the kiosk is off Wi-Fi', () => {
    const badge = getKioskConnectivityBadge({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          status: 'warning',
          issueCode: 'hotspot_not_visible',
          hotspotSsidVisibleFromLaptop: false,
          message: 'Hotspot SSID "Stone Frigate" is not visible from the laptop Wi-Fi adapter',
        },
      }),
      isLoading: false,
      isError: false,
    })

    expect(badge).toMatchObject({
      status: 'warning',
      label: 'CONNECTED (HOTSPOT WARNING)',
    })
  })
})
