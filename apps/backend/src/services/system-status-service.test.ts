import type { PrismaClientInstance } from '@sentinel/database'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KioskDevicePresenceStore } from '../lib/kiosk-device-presence.js'
import type { SessionRepository } from '../repositories/session-repository.js'
import type { HostNetworkStatusService } from './host-network-status-service.js'
import type { NetworkSettingsService } from './network-settings-service.js'
import { SystemStatusService } from './system-status-service.js'

interface SessionRepositoryMock {
  findActiveRemoteSessions: ReturnType<typeof vi.fn>
  countActiveSessions: ReturnType<typeof vi.fn>
}

function createSessionRepositoryMock(): SessionRepositoryMock {
  return {
    findActiveRemoteSessions: vi.fn().mockResolvedValue({
      activeCount: 1,
      overflowCount: 0,
      sessions: [
        {
          sessionId: 'session-1',
          memberId: 'member-1',
          memberName: 'Alex Example',
          memberRank: 'PO2',
          remoteSystemId: 'remote-1',
          remoteSystemCode: 'brow',
          remoteSystemName: 'Brow',
          lastSeenAt: new Date('2026-04-01T11:59:30.000Z'),
          ipAddress: '192.168.0.20',
        },
      ],
    }),
    countActiveSessions: vi.fn().mockResolvedValue(2),
  }
}

function createService(options?: {
  approvedSsids?: string[]
  telemetryResult?: Awaited<ReturnType<HostNetworkStatusService['readTelemetry']>>
  databaseHealthy?: boolean
  kioskPresence?: ReturnType<KioskDevicePresenceStore['listActive']>
}) {
  const prisma = {
    $queryRaw:
      options?.databaseHealthy === false
        ? vi.fn().mockRejectedValue(new Error('Database unavailable'))
        : vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  } as unknown as PrismaClientInstance

  const networkSettingsService = {
    getNetworkSettings: vi.fn().mockResolvedValue({
      settings: {
        approvedSsids: options?.approvedSsids ?? ['GC Public'],
      },
      metadata: {
        source: 'stored',
        updatedAt: '2026-04-01T11:50:00.000Z',
      },
    }),
  } as unknown as NetworkSettingsService

  const hostNetworkStatusService = {
    readTelemetry: vi.fn().mockResolvedValue(
      options?.telemetryResult ?? {
        telemetry: null,
        error: 'missing',
      }
    ),
  } as unknown as HostNetworkStatusService

  const sessionRepository = createSessionRepositoryMock()
  const kioskPresenceStore = {
    listActive: vi.fn().mockReturnValue(
      options?.kioskPresence ?? {
        activeCount: 0,
        overflowCount: 0,
        sessions: [],
      }
    ),
  } as unknown as KioskDevicePresenceStore

  const service = new SystemStatusService(prisma, {
    hostNetworkStatusService,
    networkSettingsService,
    kioskPresenceStore,
  })

  ;(service as unknown as { sessionRepository: SessionRepository }).sessionRepository =
    sessionRepository as unknown as SessionRepository

  return {
    service,
    sessionRepository,
  }
}

describe('SystemStatusService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'))
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks network status as warning when connected to an unapproved internet SSID', async () => {
    const { service } = createService({
      approvedSsids: ['ShipNet'],
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'none',
          wifiConnected: true,
          currentSsid: 'Coffee-Shop',
          hostIpAddress: '192.168.8.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlan0',
          hotspotSsidVisibleFromLaptop: true,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'Connected to Wi-Fi network',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('warning')
    expect(result.network.issueCode).toBe('unapproved_ssid')
    expect(result.network.approvedSsid).toBe(false)
    expect(result.network.currentSsid).toBe('Coffee-Shop')
    expect(result.network.hostIpAddress).toBe('192.168.8.1')
    expect(result.network.message).toContain('unapproved internet Wi-Fi SSID')
    expect(result.remoteSystems.sessions[0]?.ipAddress).toBe('192.168.0.20')
    expect(result.overall.status).toBe('warning')
  })

  it('includes active kiosk API key presence in remote systems summary', async () => {
    const { service } = createService({
      kioskPresence: {
        activeCount: 1,
        overflowCount: 0,
        sessions: [
          {
            sessionId: 'kiosk-device:kiosk-device',
            memberId: 'kiosk-device',
            memberName: 'Front entrance kiosk',
            memberRank: 'DEVICE',
            remoteSystemId: null,
            remoteSystemCode: 'kiosk',
            remoteSystemName: 'Front entrance kiosk',
            lastSeenAt: new Date('2026-04-01T11:59:40.000Z'),
            ipAddress: '192.168.0.55',
          },
        ],
      },
    })

    const result = await service.getSystemStatus()

    expect(result.remoteSystems.activeCount).toBe(2)
    expect(result.remoteSystems.status).toBe('healthy')
    expect(
      result.remoteSystems.sessions.some((session) => session.remoteSystemCode === 'kiosk')
    ).toBe(true)
  })

  it('keeps network status healthy when captive portal blocks internet but hotspot is visible', async () => {
    const { service } = createService({
      approvedSsids: ['GC Public'],
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'none',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '192.168.8.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlan0',
          hotspotSsidVisibleFromLaptop: true,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: false,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: true,
          message: 'Internet reachability failed while internet Wi-Fi is connected',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('healthy')
    expect(result.network.issueCode).toBe('none')
    expect(result.network.approvedSsid).toBe(true)
    expect(result.network.internetReachable).toBe(false)
    expect(result.network.portalRecoveryLikely).toBe(true)
    expect(result.network.hotspotSsidVisibleFromLaptop).toBe(true)
    expect(result.network.hostIpAddress).toBe('192.168.8.1')
    expect(result.network.message).toContain('internet access likely needs portal acceptance')
    expect(result.network.message).toContain('"Stone Frigate" hotspot is still visible')
    expect(result.overall.status).toBe('healthy')
  })

  it('keeps network status healthy when only the Sentinel hotspot is active', async () => {
    const { service } = createService({
      approvedSsids: ['GC Public'],
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'none',
          wifiConnected: true,
          currentSsid: null,
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp0s20f3',
          hotspotSsidVisibleFromLaptop: true,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: false,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'Sentinel hotspot is visible; internet Wi-Fi is not connected',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('healthy')
    expect(result.network.issueCode).toBe('none')
    expect(result.network.approvedSsid).toBeNull()
    expect(result.network.currentSsid).toBeNull()
    expect(result.network.hotspotSsid).toBe('Stone Frigate')
    expect(result.network.hotspotSsidVisibleFromLaptop).toBe(true)
    expect(result.network.message).toBe(
      'Sentinel hotspot is visible; internet Wi-Fi is not connected'
    )
  })

  it('keeps network status healthy when internet reachability checks are disabled', async () => {
    const { service } = createService({
      approvedSsids: ['GC Public'],
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'none',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp0s20f3',
          hotspotSsidVisibleFromLaptop: true,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: null,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: null,
          message: 'Sentinel hotspot is visible; internet reachability check is not configured',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('healthy')
    expect(result.network.issueCode).toBe('none')
    expect(result.network.approvedSsid).toBe(true)
    expect(result.network.internetReachable).toBeNull()
    expect(result.network.hotspotSsidVisibleFromLaptop).toBe(true)
    expect(result.network.message).toBe(
      'Sentinel hotspot is visible; internet reachability check is not configured'
    )
  })

  it('marks network status warning when hotspot SSID is not visible from laptop Wi-Fi', async () => {
    const { service } = createService({
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'hotspot_not_visible',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp2s0',
          hotspotSsidVisibleFromLaptop: false,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'Connected to Wi-Fi and internet is reachable',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('warning')
    expect(result.network.issueCode).toBe('hotspot_not_visible')
    expect(result.network.hotspotSsidVisibleFromLaptop).toBe(false)
    expect(result.network.message).toContain('not visible')
  })

  it('marks network status warning when the AP dongle is connected to internet Wi-Fi', async () => {
    const { service } = createService({
      approvedSsids: ['ShipNet'],
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'hotspot_adapter_busy',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '192.168.8.32',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp2s0',
          hotspotSsidVisibleFromLaptop: null,
          hotspotAdapterBusy: true,
          internetWifiConnection: 'GC PUBLIC',
          internetWifiSsid: 'GC Public',
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message:
            'The approved AP dongle is connected to internet Wi-Fi "GC Public" instead of hosting the Sentinel hotspot.',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('warning')
    expect(result.network.issueCode).toBe('hotspot_adapter_busy')
    expect(result.network.hotspotAdapterBusy).toBe(true)
    expect(result.network.internetWifiSsid).toBe('GC Public')
    expect(result.network.message).toContain('AP dongle')
  })

  it('marks network status warning when a second scan radio is unavailable', async () => {
    const { service } = createService({
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'scan_adapter_missing',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: false,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: null,
          hotspotSsidVisibleFromLaptop: null,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'A second Wi-Fi radio is unavailable for hotspot verification.',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('warning')
    expect(result.network.issueCode).toBe('scan_adapter_missing')
    expect(result.network.scanAdapterPresent).toBe(false)
    expect(result.network.message).toContain('second Wi-Fi radio')
  })

  it('marks network status warning when the managed hotspot profile is missing', async () => {
    const { service } = createService({
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'hotspot_profile_missing',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: false,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp2s0',
          hotspotSsidVisibleFromLaptop: null,
          hotspotAdapterBusy: false,
          internetWifiConnection: null,
          internetWifiSsid: null,
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'The managed Sentinel hotspot profile is missing.',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('warning')
    expect(result.network.issueCode).toBe('hotspot_profile_missing')
    expect(result.network.hotspotProfilePresent).toBe(false)
    expect(result.network.message).toContain('profile is missing')
  })

  it('uses host hotspot IP for deployment-laptop remote sessions', async () => {
    const { service, sessionRepository } = createService({
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'none',
          wifiConnected: true,
          currentSsid: 'GC Public',
          hostIpAddress: '10.42.0.1',
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
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'Connected to approved internet Wi-Fi',
        },
        error: null,
      },
    })
    sessionRepository.findActiveRemoteSessions.mockResolvedValue({
      activeCount: 1,
      overflowCount: 0,
      sessions: [
        {
          sessionId: 'session-deployment',
          memberId: 'member-1',
          memberName: 'Alex Example',
          memberRank: 'PO2',
          remoteSystemId: 'remote-1',
          remoteSystemCode: 'deployment_laptop',
          remoteSystemName: 'Deployment Laptop',
          lastSeenAt: new Date('2026-04-01T11:59:30.000Z'),
          ipAddress: '172.18.0.1',
        },
      ],
    })

    const result = await service.getSystemStatus()

    expect(result.remoteSystems.sessions[0]?.ipAddress).toBe('10.42.0.1')
  })

  it('reports host telemetry unavailable when the snapshot file is missing', async () => {
    process.env.NODE_ENV = 'production'

    const { service } = createService({
      telemetryResult: {
        telemetry: null,
        error: 'missing',
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.telemetryAvailable).toBe(false)
    expect(result.network.status).toBe('unknown')
    expect(result.network.issueCode).toBe('telemetry_unavailable')
    expect(result.network.message).toBe('Host telemetry unavailable')
    expect(result.overall.status).toBe('warning')
  })

  it('treats missing host telemetry as healthy during local development builds', async () => {
    process.env.NODE_ENV = 'development'

    const { service } = createService({
      telemetryResult: {
        telemetry: null,
        error: 'missing',
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.telemetryAvailable).toBe(false)
    expect(result.network.status).toBe('healthy')
    expect(result.network.issueCode).toBe('none')
    expect(result.network.message).toContain('Local development build detected')
    expect(result.overall.status).toBe('healthy')
  })
})
