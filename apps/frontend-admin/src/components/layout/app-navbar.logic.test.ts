import { describe, expect, it } from 'vitest'
import type { SystemStatusResponse } from '@sentinel/contracts'
import { getWirelessRecoveryState } from './app-navbar.logic'

function createSystemStatus(overrides?: Partial<SystemStatusResponse>): SystemStatusResponse {
  return {
    overall: {
      status: 'healthy',
      label: 'Healthy',
    },
    backend: {
      status: 'healthy',
      environment: 'production',
      version: '2.5.1',
      uptimeSeconds: 120,
      serviceTimestamp: '2026-04-17T12:00:00.000Z',
    },
    database: {
      healthy: false,
      address: 'postgres:5432',
    },
    network: {
      status: 'healthy',
      telemetryAvailable: true,
      telemetryAgeSeconds: 5,
      message: 'Connected to approved Wi-Fi network',
      wifiConnected: true,
      currentSsid: 'Stone Frigate',
      hostIpAddress: '192.168.8.1',
      hotspotSsid: 'Stone Frigate',
      hotspotScanDevice: 'wlp2s0',
      hotspotSsidVisibleFromLaptop: true,
      approvedSsids: ['Stone Frigate'],
      approvedSsid: true,
      internetReachable: true,
      remoteTarget: null,
      remoteReachable: null,
      portalRecoveryLikely: false,
      generatedAt: '2026-04-17T11:59:55.000Z',
    },
    remoteSystems: {
      status: 'healthy',
      activeCount: 1,
      staleThresholdSeconds: 120,
      overflowCount: 0,
      sessions: [],
    },
    lastCheckedAt: '2026-04-17T12:00:00.000Z',
    ...overrides,
  }
}

describe('app-navbar logic', () => {
  it('does not show the laptop reconnect action for non-network issues', () => {
    const result = getWirelessRecoveryState({
      systemStatus: createSystemStatus({
        overall: {
          status: 'error',
          label: 'Database issue',
        },
      }),
      isLoading: false,
      isError: false,
      hasAdminAccess: false,
    })

    expect(result.showConnectLaptop).toBe(false)
  })

  it('builds the local hotspot reconnect URI when Wi-Fi is disconnected', () => {
    const result = getWirelessRecoveryState({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          status: 'error',
          wifiConnected: false,
        },
      }),
      isLoading: false,
      isError: false,
      hasAdminAccess: false,
    })

    expect(result.showConnectLaptop).toBe(true)
    expect(result.connectLaptopHref).toBe(
      'sentinel-hotspot://connect?ssid=Stone%20Frigate'
    )
  })

  it('gates host hotspot repair to admin-capable users', () => {
    expect(
      getWirelessRecoveryState({
        systemStatus: createSystemStatus(),
        isLoading: false,
        isError: false,
        hasAdminAccess: false,
      }).showRepairHostHotspot
    ).toBe(false)

    expect(
      getWirelessRecoveryState({
        systemStatus: createSystemStatus(),
        isLoading: false,
        isError: false,
        hasAdminAccess: true,
      }).showRepairHostHotspot
    ).toBe(true)
  })

  it('keeps wireless recovery section visible when hotspot SSID is not visible from laptop Wi-Fi', () => {
    const result = getWirelessRecoveryState({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          hotspotSsidVisibleFromLaptop: false,
        },
      }),
      isLoading: false,
      isError: false,
      hasAdminAccess: false,
    })

    expect(result.showSection).toBe(true)
    expect(result.showRepairHostHotspot).toBe(false)
  })
})
