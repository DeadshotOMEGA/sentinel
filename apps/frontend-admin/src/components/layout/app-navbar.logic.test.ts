import { describe, expect, it } from 'vitest'
import type { SystemStatusResponse } from '@sentinel/contracts'
import {
  WIKI_APPLIANCE_URL,
  getWirelessRecoveryState,
  resolveWikiBaseUrl,
} from './app-navbar.logic'

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
      issueCode: 'none',
      wifiConnected: true,
      currentSsid: 'GC Public',
      hostIpAddress: '192.168.8.1',
      hotspotProfilePresent: true,
      hotspotAdapterApproved: true,
      scanAdapterPresent: true,
      hotspotDevice: 'wlxb8fbb3c4e8ae',
      hotspotSsid: 'Stone Frigate',
      hotspotScanDevice: 'wlp2s0',
      hotspotSsidVisibleFromLaptop: true,
      hotspotAdapterBusy: false,
      internetWifiConnection: null,
      internetWifiSsid: null,
      approvedSsids: ['GC Public'],
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
  it('uses the docs host when no Wiki URL is configured', () => {
    expect(resolveWikiBaseUrl('')).toBe(WIKI_APPLIANCE_URL)
  })

  it('does not use local or legacy Wiki ports for the navbar link', () => {
    expect(resolveWikiBaseUrl('http://localhost:3002')).toBe(WIKI_APPLIANCE_URL)
    expect(resolveWikiBaseUrl('http://127.0.0.1:3002')).toBe(WIKI_APPLIANCE_URL)
    expect(resolveWikiBaseUrl('http://sentinel.local:3020')).toBe(WIKI_APPLIANCE_URL)
  })

  it('keeps a configured docs host pointed at the docs root', () => {
    expect(resolveWikiBaseUrl('http://docs.sentinel.local/')).toBe(WIKI_APPLIANCE_URL)
    expect(resolveWikiBaseUrl('http://docs.sentinel.local')).toBe(WIKI_APPLIANCE_URL)
  })

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
    })

    expect(result.showConnectLaptop).toBe(false)
  })

  it('builds the local hotspot reconnect URI when Wi-Fi is disconnected', () => {
    const result = getWirelessRecoveryState({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          status: 'error',
          issueCode: 'wifi_disconnected',
          wifiConnected: false,
        },
      }),
      isLoading: false,
      isError: false,
    })

    expect(result.showConnectLaptop).toBe(true)
    expect(result.connectLaptopHref).toBe('sentinel-hotspot://connect?ssid=GC%20Public')
  })

  it('shows host hotspot repair to all authenticated users once status is available', () => {
    expect(
      getWirelessRecoveryState({
        systemStatus: createSystemStatus(),
        isLoading: false,
        isError: false,
      }).showRepairHostHotspot
    ).toBe(true)

    expect(
      getWirelessRecoveryState({
        systemStatus: createSystemStatus(),
        isLoading: true,
        isError: false,
      }).showRepairHostHotspot
    ).toBe(false)
  })

  it('keeps wireless recovery section visible when hotspot SSID is not visible from laptop Wi-Fi', () => {
    const result = getWirelessRecoveryState({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          issueCode: 'hotspot_not_visible',
          hotspotSsidVisibleFromLaptop: false,
        },
      }),
      isLoading: false,
      isError: false,
    })

    expect(result.showSection).toBe(true)
    expect(result.showRepairHostHotspot).toBe(true)
  })

  it('keeps wireless recovery section visible when the AP dongle is busy on internet Wi-Fi', () => {
    const result = getWirelessRecoveryState({
      systemStatus: createSystemStatus({
        network: {
          ...createSystemStatus().network,
          status: 'warning',
          issueCode: 'hotspot_adapter_busy',
          hotspotAdapterBusy: true,
          internetWifiSsid: 'GC Public',
        },
      }),
      isLoading: false,
      isError: false,
    })

    expect(result.showSection).toBe(true)
    expect(result.showRepairHostHotspot).toBe(true)
  })
})
