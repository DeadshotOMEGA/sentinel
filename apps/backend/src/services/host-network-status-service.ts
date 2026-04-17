import { readFile } from 'node:fs/promises'
import { logger } from '../lib/logger.js'

const DEFAULT_NETWORK_STATUS_FILE_PATH = '/var/run/sentinel/network-status/network-status.json'

export interface HostNetworkTelemetry {
  generatedAt: Date
  wifiConnected: boolean | null
  currentSsid: string | null
  hostIpAddress: string | null
  internetReachable: boolean | null
  remoteTarget: string | null
  remoteReachable: boolean | null
  portalRecoveryLikely: boolean | null
  message: string | null
}

export interface HostNetworkTelemetryResult {
  telemetry: HostNetworkTelemetry | null
  error: 'missing' | 'invalid' | null
}

function normalizeNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseTelemetry(payload: unknown): HostNetworkTelemetry | null {
  if (!isRecord(payload)) {
    return null
  }

  const generatedAtValue = payload.generatedAt
  if (typeof generatedAtValue !== 'string') {
    return null
  }

  const generatedAt = new Date(generatedAtValue)
  if (Number.isNaN(generatedAt.getTime())) {
    return null
  }

  return {
    generatedAt,
    wifiConnected: normalizeNullableBoolean(payload.wifiConnected),
    currentSsid: normalizeNullableString(payload.currentSsid),
    hostIpAddress: normalizeNullableString(payload.hostIpAddress),
    internetReachable: normalizeNullableBoolean(payload.internetReachable),
    remoteTarget: normalizeNullableString(payload.remoteTarget),
    remoteReachable: normalizeNullableBoolean(payload.remoteReachable),
    portalRecoveryLikely: normalizeNullableBoolean(payload.portalRecoveryLikely),
    message: normalizeNullableString(payload.message),
  }
}

export class HostNetworkStatusService {
  private readonly filePath: string

  constructor(
    filePath: string = process.env.NETWORK_STATUS_FILE_PATH || DEFAULT_NETWORK_STATUS_FILE_PATH
  ) {
    this.filePath = filePath
  }

  async readTelemetry(): Promise<HostNetworkTelemetryResult> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const payload = JSON.parse(raw) as unknown
      const telemetry = parseTelemetry(payload)

      if (!telemetry) {
        logger.warn('Host network telemetry file is invalid JSON shape', {
          filePath: this.filePath,
        })
        return { telemetry: null, error: 'invalid' }
      }

      return { telemetry, error: null }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { telemetry: null, error: 'missing' }
      }

      logger.warn('Unable to read host network telemetry', {
        filePath: this.filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return { telemetry: null, error: 'invalid' }
    }
  }
}

export { DEFAULT_NETWORK_STATUS_FILE_PATH }
