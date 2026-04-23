import type { PrismaClientInstance } from '@sentinel/database'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
        approvedSsids: options?.approvedSsids ?? ['Stone Frigate'],
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

  const service = new SystemStatusService(prisma, {
    hostNetworkStatusService,
    networkSettingsService,
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

  it('marks network status as warning when connected to an unapproved SSID', async () => {
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
    expect(result.network.message).toContain('unapproved Wi-Fi SSID')
    expect(result.remoteSystems.sessions[0]?.ipAddress).toBe('192.168.0.20')
    expect(result.overall.status).toBe('warning')
  })

  it('keeps network status healthy when internet reachability is unavailable but Wi-Fi is approved', async () => {
    const { service } = createService({
      approvedSsids: ['Stone Frigate'],
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'none',
          wifiConnected: true,
          currentSsid: 'Stone Frigate',
          hostIpAddress: '192.168.8.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlan0',
          hotspotSsidVisibleFromLaptop: true,
          internetReachable: false,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'Connected to approved Wi-Fi network',
        },
        error: null,
      },
    })

    const result = await service.getSystemStatus()

    expect(result.network.status).toBe('healthy')
    expect(result.network.issueCode).toBe('none')
    expect(result.network.approvedSsid).toBe(true)
    expect(result.network.hostIpAddress).toBe('192.168.8.1')
    expect(result.network.message).toBe('Connected to approved Wi-Fi network')
    expect(result.overall.status).toBe('healthy')
  })

  it('marks network status warning when hotspot SSID is not visible from laptop Wi-Fi', async () => {
    const { service } = createService({
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'hotspot_not_visible',
          wifiConnected: true,
          currentSsid: 'Stone Frigate',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp2s0',
          hotspotSsidVisibleFromLaptop: false,
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

  it('marks network status warning when a second scan radio is unavailable', async () => {
    const { service } = createService({
      telemetryResult: {
        telemetry: {
          generatedAt: new Date('2026-04-01T11:59:40.000Z'),
          issueCode: 'scan_adapter_missing',
          wifiConnected: true,
          currentSsid: 'Stone Frigate',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: false,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: null,
          hotspotSsidVisibleFromLaptop: null,
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
          currentSsid: 'Stone Frigate',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: false,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp2s0',
          hotspotSsidVisibleFromLaptop: null,
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
          currentSsid: 'Stone Frigate',
          hostIpAddress: '10.42.0.1',
          hotspotProfilePresent: true,
          hotspotAdapterApproved: true,
          scanAdapterPresent: true,
          hotspotDevice: 'wlxb8fbb3c4e8ae',
          hotspotSsid: 'Stone Frigate',
          hotspotScanDevice: 'wlp2s0',
          hotspotSsidVisibleFromLaptop: true,
          internetReachable: true,
          remoteTarget: null,
          remoteReachable: null,
          portalRecoveryLikely: false,
          message: 'Connected to approved Wi-Fi network',
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
