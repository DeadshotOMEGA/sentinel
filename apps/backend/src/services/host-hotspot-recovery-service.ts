import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { HostHotspotRecoveryStatus, HostHotspotRecoveryStage } from '@sentinel/contracts'

export const DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR =
  '/opt/sentinel/deploy/runtime/hotspot-recovery/requests'
export const DEFAULT_HOST_HOTSPOT_RECOVERY_STATUS_FILE =
  '/opt/sentinel/deploy/runtime/hotspot-recovery/status.json'
const HOST_HOTSPOT_RECOVERY_STATUS_STALE_SECONDS = 600

export interface QueueHostHotspotRecoveryInput {
  requestedByMemberId: string
  requestedByMemberName: string
  requestedByRemoteSystemName: string | null
  requestedFromIp: string | null
  requestedFromUserAgent: string | null
  source?: string
}

export class HostHotspotRecoveryService {
  private readonly requestDir: string
  private readonly statusFilePath: string

  constructor(requestDir?: string, statusFilePath?: string) {
    requestDir =
      requestDir ??
      process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR ??
      DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR
    this.requestDir = requestDir
    this.statusFilePath =
      statusFilePath ??
      process.env.HOST_HOTSPOT_RECOVERY_STATUS_FILE ??
      resolveDefaultStatusFilePath(requestDir)
  }

  async queueRecoveryRequest(input: QueueHostHotspotRecoveryInput): Promise<{
    requestId: string
    requestPath: string
  }> {
    const requestId = `host-hotspot-recovery-${Date.now()}-${randomUUID()}`
    const requestPath = join(this.requestDir, `${requestId}.json`)
    const { source, ...requestInput } = input
    const payload = {
      requestId,
      requestedAt: new Date().toISOString(),
      source: source ?? 'frontend-admin',
      ...requestInput,
    }

    try {
      await mkdir(this.requestDir, { recursive: true })
      await writeFile(requestPath, JSON.stringify(payload, null, 2), {
        encoding: 'utf-8',
        flag: 'wx',
      })
    } catch (error) {
      throw new HostHotspotRecoveryQueueError(this.requestDir, error)
    }

    await this.writeRecoveryStatus({
      state: 'queued',
      stage: 'request_queued',
      message: 'Host hotspot repair request queued. Waiting for the host processor to start.',
      requestId,
      requestedAt: payload.requestedAt,
    })

    return {
      requestId,
      requestPath,
    }
  }

  async readLatestStatus(): Promise<HostHotspotRecoveryStatus | null> {
    try {
      const raw = await readFile(this.statusFilePath, 'utf-8')
      const status = parseHostHotspotRecoveryStatus(JSON.parse(raw) as unknown)
      if (!status || isStaleRecoveryStatus(status)) {
        return null
      }

      return status
    } catch {
      return null
    }
  }

  private async writeRecoveryStatus(input: {
    state: HostHotspotRecoveryStatus['state']
    stage: HostHotspotRecoveryStage
    message: string
    requestId: string
    requestedAt: string
  }): Promise<void> {
    const status: HostHotspotRecoveryStatus = {
      state: input.state,
      stage: input.stage,
      message: input.message,
      requestId: input.requestId,
      connectionName: null,
      hotspotSsid: null,
      hotspotDevice: null,
      scanDevice: null,
      usbDevice: null,
      hardwareResetApplied: null,
      startedAt: input.requestedAt,
      updatedAt: new Date().toISOString(),
      completedAt: null,
    }

    try {
      await mkdir(dirname(this.statusFilePath), { recursive: true })
      await writeFile(this.statusFilePath, JSON.stringify(status, null, 2), {
        encoding: 'utf-8',
      })
    } catch {
      // The request file is the source of truth for recovery execution. Status is best-effort UI telemetry.
    }
  }
}

export class HostHotspotRecoveryQueueError extends Error {
  constructor(requestDir: string, cause: unknown) {
    super(createHostHotspotRecoveryQueueErrorMessage(requestDir, cause), { cause })
    this.name = 'HostHotspotRecoveryQueueError'
  }
}

function createHostHotspotRecoveryQueueErrorMessage(requestDir: string, cause: unknown): string {
  if (isPermissionError(cause)) {
    return [
      `Sentinel could not write the host hotspot repair queue at ${requestDir}.`,
      'Run the installer or update process again so the runtime directory is created for the backend service.',
    ].join(' ')
  }

  return cause instanceof Error ? cause.message : 'Failed to queue host hotspot recovery'
}

function isPermissionError(error: unknown): boolean {
  return (
    error instanceof Error && 'code' in error && (error as { code?: unknown }).code === 'EACCES'
  )
}

function resolveDefaultStatusFilePath(requestDir: string): string {
  return basename(requestDir) === 'requests'
    ? join(dirname(requestDir), 'status.json')
    : join(requestDir, 'status.json')
}

function parseHostHotspotRecoveryStatus(payload: unknown): HostHotspotRecoveryStatus | null {
  if (!isRecord(payload)) {
    return null
  }

  const state = parseRecoveryState(payload.state)
  const stage = parseRecoveryStage(payload.stage)
  const message = normalizeNullableString(payload.message)
  const updatedAt = normalizeTimestampString(payload.updatedAt)

  if (!state || !stage || !message || !updatedAt) {
    return null
  }

  return {
    state,
    stage,
    message,
    requestId: normalizeNullableString(payload.requestId),
    connectionName: normalizeNullableString(payload.connectionName),
    hotspotSsid: normalizeNullableString(payload.hotspotSsid),
    hotspotDevice: normalizeNullableString(payload.hotspotDevice),
    scanDevice: normalizeNullableString(payload.scanDevice),
    usbDevice: normalizeNullableString(payload.usbDevice),
    hardwareResetApplied: normalizeNullableBoolean(payload.hardwareResetApplied),
    startedAt: normalizeTimestampString(payload.startedAt),
    updatedAt,
    completedAt: normalizeTimestampString(payload.completedAt),
  }
}

function parseRecoveryState(value: unknown): HostHotspotRecoveryStatus['state'] | null {
  switch (value) {
    case 'queued':
    case 'running':
    case 'completed':
    case 'failed':
      return value
    default:
      return null
  }
}

function parseRecoveryStage(value: unknown): HostHotspotRecoveryStage | null {
  switch (value) {
    case 'request_queued':
    case 'processing_request':
    case 'moving_internet_wifi':
    case 'ensuring_profile':
    case 'stopping_hotspot':
    case 'resetting_driver':
    case 'resetting_usb':
    case 'waiting_for_adapter':
    case 'starting_hotspot':
    case 'verifying_visibility':
    case 'completed':
    case 'failed':
      return value
    default:
      return null
  }
}

function normalizeNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeTimestampString(value: unknown): string | null {
  const normalized = normalizeNullableString(value)
  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStaleRecoveryStatus(status: HostHotspotRecoveryStatus): boolean {
  const updatedAt = new Date(status.updatedAt)
  const ageSeconds = Math.max(0, (Date.now() - updatedAt.getTime()) / 1_000)
  return ageSeconds > HOST_HOTSPOT_RECOVERY_STATUS_STALE_SECONDS
}
