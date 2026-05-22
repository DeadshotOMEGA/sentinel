import type { HostHotspotRecoveryStatus, SystemStatusResponse } from '@sentinel/contracts'

const AUTOMATED_RECOVERY_SOURCES = new Set(['host-hotspot-monitor', 'backend-scheduler'])
const DEFAULT_ESTIMATED_RECOVERY_SECONDS = 45
const AUTOMATED_RECOVERY_STATUS_REFETCH_INTERVAL_MS = 1_000

export function isAutomatedHotspotRecovery(
  recoveryStatus: HostHotspotRecoveryStatus | null | undefined
): boolean {
  const source = recoveryStatus?.source
  return typeof source === 'string' && AUTOMATED_RECOVERY_SOURCES.has(source)
}

export function isAutomatedHotspotRecoveryActive(
  systemStatus: SystemStatusResponse | null | undefined
): boolean {
  const recoveryStatus = systemStatus?.network.hostHotspotRecovery
  return (
    isAutomatedHotspotRecovery(recoveryStatus) &&
    (recoveryStatus?.state === 'queued' || recoveryStatus?.state === 'running')
  )
}

export function isAutomatedHotspotRecoveryComplete(
  systemStatus: SystemStatusResponse | null | undefined
): boolean {
  const recoveryStatus = systemStatus?.network.hostHotspotRecovery
  return (
    isAutomatedHotspotRecovery(recoveryStatus) &&
    recoveryStatus?.state === 'completed' &&
    systemStatus?.network.issueCode === 'none'
  )
}

export function getRecoveryEstimateSeconds(
  recoveryStatus: HostHotspotRecoveryStatus | null | undefined
): number {
  const estimate = recoveryStatus?.estimatedDurationSeconds
  return typeof estimate === 'number' && Number.isFinite(estimate) && estimate > 0
    ? Math.round(estimate)
    : DEFAULT_ESTIMATED_RECOVERY_SECONDS
}

export function getRecoveryElapsedSeconds(
  recoveryStatus: HostHotspotRecoveryStatus | null | undefined,
  nowMs = Date.now()
): number {
  const startedAt = recoveryStatus?.startedAt
  if (!startedAt) {
    return 0
  }

  const startedAtMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedAtMs)) {
    return 0
  }

  return Math.max(0, Math.round((nowMs - startedAtMs) / 1_000))
}

export function getRecoveryRemainingSeconds(
  recoveryStatus: HostHotspotRecoveryStatus | null | undefined,
  nowMs = Date.now()
): number {
  return Math.max(
    0,
    getRecoveryEstimateSeconds(recoveryStatus) - getRecoveryElapsedSeconds(recoveryStatus, nowMs)
  )
}

export function getRecoveryProgressPercent(
  recoveryStatus: HostHotspotRecoveryStatus | null | undefined,
  nowMs = Date.now()
): number {
  if (recoveryStatus?.state === 'completed') {
    return 100
  }

  if (recoveryStatus?.state === 'failed') {
    return 100
  }

  const estimate = getRecoveryEstimateSeconds(recoveryStatus)
  const elapsed = getRecoveryElapsedSeconds(recoveryStatus, nowMs)
  const calculated = Math.round((elapsed / estimate) * 100)
  return Math.min(95, Math.max(10, calculated))
}

export function formatRecoveryTime(seconds: number): string {
  const normalized = Math.max(0, Math.round(seconds))
  if (normalized < 60) {
    return `${normalized}s`
  }

  const minutes = Math.floor(normalized / 60)
  const remainder = normalized % 60
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
}

export function getRecoveryRequestKey(
  recoveryStatus: HostHotspotRecoveryStatus | null | undefined
): string | null {
  if (!recoveryStatus) {
    return null
  }

  return (
    recoveryStatus.requestId ?? `${recoveryStatus.source ?? 'unknown'}:${recoveryStatus.updatedAt}`
  )
}

export function getAutomatedRecoveryStatusRefetchIntervalMs(): number {
  return AUTOMATED_RECOVERY_STATUS_REFETCH_INTERVAL_MS
}
