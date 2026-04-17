import { readFileSync } from 'node:fs'
import type { PrismaClientInstance } from '@sentinel/database'
import type { SystemHealthStatus, SystemStatusResponse } from '@sentinel/contracts'
import { prisma as defaultPrisma } from '@sentinel/database'
import {
  activeRemoteSessions,
  activeSessions,
  hostNetworkStatusAgeSeconds,
  networkStatusDegradationsTotal,
} from '../lib/metrics.js'
import { logger } from '../lib/logger.js'
import { isDevelopmentBuild, isRunningInsideContainer } from '../lib/runtime-context.js'
import { DEPLOYMENT_REMOTE_SYSTEM_CODE } from '../repositories/remote-system-repository.js'
import { SessionRepository } from '../repositories/session-repository.js'
import { HostNetworkStatusService } from './host-network-status-service.js'
import { NetworkSettingsService } from './network-settings-service.js'

const REMOTE_SESSION_LIMIT = 5
const ACTIVE_REMOTE_SESSION_THRESHOLD_SECONDS = 120
const TELEMETRY_STALE_WARNING_SECONDS = 120

function normalizeVersion(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 'unknown'
  }

  return trimmed.startsWith('v') ? trimmed.slice(1) : trimmed
}

function resolveServiceVersion(): string {
  const appVersion = process.env.APP_VERSION
  if (typeof appVersion === 'string' && appVersion.trim().length > 0) {
    return normalizeVersion(appVersion)
  }

  try {
    const packageJsonPath = new globalThis.URL('../../package.json', import.meta.url)
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version?: unknown
    }
    if (typeof packageJson.version === 'string' && packageJson.version.length > 0) {
      return normalizeVersion(packageJson.version)
    }
  } catch (error) {
    logger.warn('Unable to resolve backend version from package.json', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  const processVersion = process.env.npm_package_version || process.env.SENTINEL_VERSION
  if (typeof processVersion === 'string' && processVersion.trim().length > 0) {
    return normalizeVersion(processVersion)
  }

  return 'unknown'
}

function resolveDatabaseAddress(): string | null {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return null
  }

  try {
    const parsed = new globalThis.URL(databaseUrl)
    if (!parsed.hostname) {
      return null
    }

    const defaultPort =
      parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:' ? '5432' : ''
    const port = parsed.port || defaultPort
    return port ? `${parsed.hostname}:${port}` : parsed.hostname
  } catch {
    return null
  }
}

function resolveNetworkStatusMessage(input: {
  telemetryAvailable: boolean
  developmentBuild: boolean
  runningInsideContainer: boolean
  telemetryAgeSeconds: number | null
  approvedSsidsConfigured: boolean
  wifiConnected: boolean | null
  approvedSsid: boolean | null
  hotspotSsid: string | null
  hotspotSsidVisibleFromLaptop: boolean | null
  internetReachable: boolean | null
  remoteTarget: string | null
  remoteReachable: boolean | null
  portalRecoveryLikely: boolean | null
  fallbackMessage: string | null
}): string {
  if (!input.telemetryAvailable) {
    if (input.developmentBuild) {
      if (input.runningInsideContainer) {
        return 'Development build running in container; host telemetry checks are optional'
      }

      return 'Local development build detected on this laptop; host telemetry checks are optional'
    }

    return 'Host telemetry unavailable'
  }

  if (
    input.telemetryAgeSeconds !== null &&
    input.telemetryAgeSeconds > TELEMETRY_STALE_WARNING_SECONDS
  ) {
    return 'Host telemetry is stale'
  }

  if (input.wifiConnected === false) {
    return 'Wi-Fi disconnected'
  }

  if (input.approvedSsid === false) {
    return 'Connected to an unapproved Wi-Fi SSID'
  }

  if (input.hotspotSsidVisibleFromLaptop === false) {
    if (input.hotspotSsid) {
      return `Hotspot SSID "${input.hotspotSsid}" is not visible from the laptop Wi-Fi adapter`
    }

    return 'Hosted hotspot SSID is not visible from the laptop Wi-Fi adapter'
  }

  if (input.remoteTarget && input.remoteReachable === false) {
    return `Remote reachability check failed for ${input.remoteTarget}`
  }

  if (input.fallbackMessage) {
    return input.fallbackMessage
  }

  if (input.approvedSsidsConfigured && input.approvedSsid === true) {
    return 'Connected to approved Wi-Fi network'
  }

  return 'Connected to Wi-Fi network'
}

function resolveNetworkStatus(input: {
  telemetryAvailable: boolean
  developmentBuild: boolean
  telemetryAgeSeconds: number | null
  wifiConnected: boolean | null
  approvedSsid: boolean | null
  hotspotSsidVisibleFromLaptop: boolean | null
  internetReachable: boolean | null
  remoteTarget: string | null
  remoteReachable: boolean | null
}): SystemHealthStatus {
  if (!input.telemetryAvailable) {
    if (input.developmentBuild) {
      return 'healthy'
    }

    return 'unknown'
  }

  if (
    input.telemetryAgeSeconds !== null &&
    input.telemetryAgeSeconds > TELEMETRY_STALE_WARNING_SECONDS
  ) {
    return 'warning'
  }

  if (input.wifiConnected === false) {
    return 'error'
  }

  if (input.approvedSsid === false) {
    return 'warning'
  }

  if (input.hotspotSsidVisibleFromLaptop === false) {
    return 'warning'
  }

  if (input.remoteTarget && input.remoteReachable === false) {
    return 'warning'
  }

  if (input.wifiConnected === true) {
    return 'healthy'
  }

  return 'unknown'
}

function resolveOverallStatus(input: {
  databaseHealthy: boolean
  networkStatus: SystemHealthStatus
}): { status: SystemHealthStatus; label: string } {
  if (!input.databaseHealthy) {
    return {
      status: 'error',
      label: 'Database issue',
    }
  }

  if (input.networkStatus === 'error') {
    return {
      status: 'error',
      label: 'Network issue',
    }
  }

  if (input.networkStatus === 'warning' || input.networkStatus === 'unknown') {
    return {
      status: 'warning',
      label: 'Needs attention',
    }
  }

  return {
    status: 'healthy',
    label: 'Healthy',
  }
}

export class SystemStatusService {
  private prisma: PrismaClientInstance
  private sessionRepository: SessionRepository
  private networkSettingsService: NetworkSettingsService
  private hostNetworkStatusService: HostNetworkStatusService

  constructor(
    prismaClient: PrismaClientInstance = defaultPrisma,
    options?: {
      hostNetworkStatusService?: HostNetworkStatusService
      networkSettingsService?: NetworkSettingsService
    }
  ) {
    this.prisma = prismaClient
    this.sessionRepository = new SessionRepository(prismaClient)
    this.networkSettingsService =
      options?.networkSettingsService ?? new NetworkSettingsService(prismaClient)
    this.hostNetworkStatusService =
      options?.hostNetworkStatusService ?? new HostNetworkStatusService()
  }

  async getSystemStatus(): Promise<SystemStatusResponse> {
    const lastCheckedAt = new Date()
    const developmentBuild = isDevelopmentBuild()
    const runningInsideContainer = isRunningInsideContainer()

    const [networkSettingsState, telemetryResult, remoteSessions, activeSessionCount] =
      await Promise.all([
        this.networkSettingsService.getNetworkSettings(),
        this.hostNetworkStatusService.readTelemetry(),
        this.sessionRepository.findActiveRemoteSessions({
          limit: REMOTE_SESSION_LIMIT,
          activeWithinSeconds: ACTIVE_REMOTE_SESSION_THRESHOLD_SECONDS,
        }),
        this.sessionRepository.countActiveSessions(),
      ])

    let databaseHealthy = false
    try {
      await this.prisma.$queryRaw`SELECT 1`
      databaseHealthy = true
    } catch (error) {
      logger.error('System status database check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    const telemetry = telemetryResult.telemetry
    const telemetryAgeSeconds = telemetry
      ? Math.max(0, Math.round((lastCheckedAt.getTime() - telemetry.generatedAt.getTime()) / 1000))
      : null

    const approvedSsids = networkSettingsState.settings.approvedSsids
    const approvedSsid =
      approvedSsids.length > 0 && telemetry?.currentSsid
        ? approvedSsids.some(
            (ssid) =>
              ssid.localeCompare(telemetry.currentSsid ?? '', undefined, {
                sensitivity: 'accent',
              }) === 0
          )
        : null

    const networkStatus = resolveNetworkStatus({
      telemetryAvailable: telemetry !== null,
      developmentBuild,
      telemetryAgeSeconds,
      wifiConnected: telemetry?.wifiConnected ?? null,
      approvedSsid,
      hotspotSsidVisibleFromLaptop: telemetry?.hotspotSsidVisibleFromLaptop ?? null,
      internetReachable: telemetry?.internetReachable ?? null,
      remoteTarget: telemetry?.remoteTarget ?? null,
      remoteReachable: telemetry?.remoteReachable ?? null,
    })

    if (networkStatus === 'warning' || networkStatus === 'error') {
      networkStatusDegradationsTotal.inc({ status: networkStatus })
    }

    hostNetworkStatusAgeSeconds.set(telemetryAgeSeconds ?? -1)
    activeSessions.set(activeSessionCount)
    activeRemoteSessions.set(remoteSessions.activeCount)

    return {
      overall: resolveOverallStatus({
        databaseHealthy,
        networkStatus,
      }),
      backend: {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        version: resolveServiceVersion(),
        uptimeSeconds: process.uptime(),
        serviceTimestamp: lastCheckedAt.toISOString(),
      },
      database: {
        healthy: databaseHealthy,
        address: resolveDatabaseAddress(),
      },
      network: {
        status: networkStatus,
        telemetryAvailable: telemetry !== null,
        telemetryAgeSeconds,
        message: resolveNetworkStatusMessage({
          telemetryAvailable: telemetry !== null,
          developmentBuild,
          runningInsideContainer,
          telemetryAgeSeconds,
          approvedSsidsConfigured: approvedSsids.length > 0,
          wifiConnected: telemetry?.wifiConnected ?? null,
          approvedSsid,
          hotspotSsid: telemetry?.hotspotSsid ?? null,
          hotspotSsidVisibleFromLaptop: telemetry?.hotspotSsidVisibleFromLaptop ?? null,
          internetReachable: telemetry?.internetReachable ?? null,
          remoteTarget: telemetry?.remoteTarget ?? null,
          remoteReachable: telemetry?.remoteReachable ?? null,
          portalRecoveryLikely: telemetry?.portalRecoveryLikely ?? null,
          fallbackMessage: telemetry?.message ?? null,
        }),
        wifiConnected: telemetry?.wifiConnected ?? null,
        currentSsid: telemetry?.currentSsid ?? null,
        hostIpAddress: telemetry?.hostIpAddress ?? null,
        hotspotSsid: telemetry?.hotspotSsid ?? null,
        hotspotScanDevice: telemetry?.hotspotScanDevice ?? null,
        hotspotSsidVisibleFromLaptop: telemetry?.hotspotSsidVisibleFromLaptop ?? null,
        approvedSsids,
        approvedSsid,
        internetReachable: telemetry?.internetReachable ?? null,
        remoteTarget: telemetry?.remoteTarget ?? null,
        remoteReachable: telemetry?.remoteReachable ?? null,
        portalRecoveryLikely: telemetry?.portalRecoveryLikely ?? null,
        generatedAt: telemetry?.generatedAt.toISOString() ?? null,
      },
      remoteSystems: {
        status: remoteSessions.activeCount > 0 ? 'healthy' : 'unknown',
        activeCount: remoteSessions.activeCount,
        staleThresholdSeconds: ACTIVE_REMOTE_SESSION_THRESHOLD_SECONDS,
        overflowCount: remoteSessions.overflowCount,
        sessions: remoteSessions.sessions.map((session) => ({
          sessionId: session.sessionId,
          memberId: session.memberId,
          memberName: session.memberName,
          memberRank: session.memberRank,
          remoteSystemId: session.remoteSystemId,
          remoteSystemCode: session.remoteSystemCode,
          remoteSystemName: session.remoteSystemName,
          lastSeenAt: session.lastSeenAt.toISOString(),
          ipAddress:
            session.remoteSystemCode === DEPLOYMENT_REMOTE_SYSTEM_CODE
              ? (telemetry?.hostIpAddress ?? session.ipAddress)
              : session.ipAddress,
        })),
      },
      lastCheckedAt: lastCheckedAt.toISOString(),
    }
  }
}
