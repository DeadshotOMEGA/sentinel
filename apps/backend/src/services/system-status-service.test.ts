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
        approvedSsids: options?.approvedSsids ?? ['HMCS-Chippawa'],
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
          wifiConnected: true,
          currentSsid: 'Coffee-Shop',
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
    expect(result.network.approvedSsid).toBe(false)
    expect(result.network.currentSsid).toBe('Coffee-Shop')
    expect(result.network.message).toContain('unapproved Wi-Fi SSID')
    expect(result.overall.status).toBe('warning')
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
    expect(result.network.message).toContain('Local development build detected')
    expect(result.overall.status).toBe('healthy')
  })
})
