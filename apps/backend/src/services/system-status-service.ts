import type { PrismaClientInstance } from '@sentinel/database'
import type {
  NetworkIssueCode,
  SystemHealthStatus,
  SystemStatusResponse,
} from '@sentinel/contracts'
import { prisma as defaultPrisma } from '@sentinel/database'
import {
  activeRemoteSessions,
  activeSessions,
  hostNetworkStatusAgeSeconds,
  networkStatusDegradationsTotal,
} from '../lib/metrics.js'
import { logger } from '../lib/logger.js'
import { isDevelopmentBuild, isRunningInsideContainer } from '../lib/runtime-context.js'
import { resolveServiceVersionDisplay } from '../lib/service-version.js'
import { DEPLOYMENT_REMOTE_SYSTEM_CODE } from '../repositories/remote-system-repository.js'
import { SessionRepository } from '../repositories/session-repository.js'
import { HostNetworkStatusService } from './host-network-status-service.js'
import { NetworkSettingsService } from './network-settings-service.js'

const REMOTE_SESSION_LIMIT = 5
const ACTIVE_REMOTE_SESSION_THRESHOLD_SECONDS = 120
const TELEMETRY_STALE_WARNING_SECONDS = 120

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

function normalizeTelemetryIssueCode(value: string | null): NetworkIssueCode {
  switch (value) {
    case 'telemetry_unavailable':
    case 'telemetry_stale':
    case 'wifi_disconnected':
    case 'unapproved_ssid':
    case 'hotspot_profile_missing':
    case 'approved_hotspot_adapter_missing':
    case 'scan_adapter_missing':
    case 'hotspot_not_visible':
    case 'remote_reachability_failed':
      return value
    default:
      return 'none'
  }
}

function resolveNetworkIssueCode(input: {
  telemetryAvailable: boolean
  developmentBuild: boolean
  telemetryAgeSeconds: number | null
  wifiConnected: boolean | null
  approvedSsid: boolean | null
  telemetryIssueCode: string | null
  remoteTarget: string | null
  remoteReachable: boolean | null
}): NetworkIssueCode {
  if (!input.telemetryAvailable) {
    return input.developmentBuild ? 'none' : 'telemetry_unavailable'
  }

  if (
    input.telemetryAgeSeconds !== null &&
    input.telemetryAgeSeconds > TELEMETRY_STALE_WARNING_SECONDS
  ) {
    return 'telemetry_stale'
  }

  if (input.wifiConnected === false) {
    return 'wifi_disconnected'
  }

  if (input.approvedSsid === false) {
    return 'unapproved_ssid'
  }

  const telemetryIssueCode = normalizeTelemetryIssueCode(input.telemetryIssueCode)
  if (telemetryIssueCode !== 'none') {
    return telemetryIssueCode
  }

  if (input.remoteTarget && input.remoteReachable === false) {
    return 'remote_reachability_failed'
  }

  return 'none'
}

function resolveNetworkStatusMessage(input: {
  issueCode: NetworkIssueCode
  telemetryAvailable: boolean
  developmentBuild: boolean
  runningInsideContainer: boolean
  approvedSsidsConfigured: boolean
  wifiConnected: boolean | null
  approvedSsid: boolean | null
  hotspotSsid: string | null
  remoteTarget: string | null
  fallbackMessage: string | null
}): string {
  if (!input.telemetryAvailable && input.developmentBuild) {
    if (input.runningInsideContainer) {
      return 'Development build running in container; host telemetry checks are optional'
    }

    return 'Local development build detected on this laptop; host telemetry checks are optional'
  }

  switch (input.issueCode) {
    case 'telemetry_unavailable':
      return 'Host telemetry unavailable'
    case 'telemetry_stale':
      return 'Host telemetry is stale'
    case 'wifi_disconnected':
      return 'Wi-Fi disconnected'
    case 'unapproved_ssid':
      return 'Connected to an unapproved Wi-Fi SSID'
    case 'hotspot_profile_missing':
      return 'The managed Sentinel hotspot profile is missing.'
    case 'approved_hotspot_adapter_missing':
      return 'No approved hotspot dongle is available on this laptop.'
    case 'scan_adapter_missing':
      return 'A second Wi-Fi radio is unavailable for hotspot verification.'
    case 'hotspot_not_visible':
      if (input.hotspotSsid) {
        return `Hotspot SSID "${input.hotspotSsid}" is not visible from the laptop Wi-Fi adapter`
      }

      return 'Hosted hotspot SSID is not visible from the laptop Wi-Fi adapter'
    case 'remote_reachability_failed':
      return input.remoteTarget
        ? `Remote reachability check failed for ${input.remoteTarget}`
        : 'Remote reachability check failed'
    case 'none':
    default:
      break
  }

  if (input.approvedSsidsConfigured && input.approvedSsid === true) {
    return 'Connected to approved Wi-Fi network'
  }

  if (input.fallbackMessage) {
    return input.fallbackMessage
  }

  if (input.wifiConnected === true) {
    return 'Connected to Wi-Fi network'
  }

  return 'Connected to Wi-Fi network'
}

function resolveNetworkStatus(input: {
  issueCode: NetworkIssueCode
  telemetryAvailable: boolean
  developmentBuild: boolean
  wifiConnected: boolean | null
}): SystemHealthStatus {
  if (!input.telemetryAvailable && input.developmentBuild) {
    return 'healthy'
  }

  switch (input.issueCode) {
    case 'none':
      return input.wifiConnected === true ? 'healthy' : 'unknown'
    case 'telemetry_unavailable':
      return 'unknown'
    case 'wifi_disconnected':
      return 'error'
    default:
      return 'warning'
  }
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

    const networkIssueCode = resolveNetworkIssueCode({
      telemetryAvailable: telemetry !== null,
      developmentBuild,
      telemetryAgeSeconds,
      wifiConnected: telemetry?.wifiConnected ?? null,
      approvedSsid,
      telemetryIssueCode: telemetry?.issueCode ?? null,
      remoteTarget: telemetry?.remoteTarget ?? null,
      remoteReachable: telemetry?.remoteReachable ?? null,
    })
    const networkStatus = resolveNetworkStatus({
      issueCode: networkIssueCode,
      telemetryAvailable: telemetry !== null,
      developmentBuild,
      wifiConnected: telemetry?.wifiConnected ?? null,
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
        version: resolveServiceVersionDisplay(),
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
        issueCode: networkIssueCode,
        message: resolveNetworkStatusMessage({
          issueCode: networkIssueCode,
          telemetryAvailable: telemetry !== null,
          developmentBuild,
          runningInsideContainer,
          approvedSsidsConfigured: approvedSsids.length > 0,
          wifiConnected: telemetry?.wifiConnected ?? null,
          approvedSsid,
          hotspotSsid: telemetry?.hotspotSsid ?? null,
          remoteTarget: telemetry?.remoteTarget ?? null,
          fallbackMessage: telemetry?.message ?? null,
        }),
        wifiConnected: telemetry?.wifiConnected ?? null,
        currentSsid: telemetry?.currentSsid ?? null,
        hostIpAddress: telemetry?.hostIpAddress ?? null,
        hotspotProfilePresent: telemetry?.hotspotProfilePresent ?? null,
        hotspotAdapterApproved: telemetry?.hotspotAdapterApproved ?? null,
        scanAdapterPresent: telemetry?.scanAdapterPresent ?? null,
        hotspotDevice: telemetry?.hotspotDevice ?? null,
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
