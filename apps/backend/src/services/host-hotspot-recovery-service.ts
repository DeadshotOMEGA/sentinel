import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR =
  '/opt/sentinel/deploy/runtime/hotspot-recovery/requests'

export interface QueueHostHotspotRecoveryInput {
  requestedByMemberId: string
  requestedByMemberName: string
  requestedByRemoteSystemName: string | null
  requestedFromIp: string | null
  requestedFromUserAgent: string | null
}

export class HostHotspotRecoveryService {
  private readonly requestDir: string

  constructor(requestDir?: string) {
    requestDir =
      requestDir ??
      process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR ??
      DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR
    this.requestDir = requestDir
  }

  async queueRecoveryRequest(input: QueueHostHotspotRecoveryInput): Promise<{
    requestId: string
    requestPath: string
  }> {
    const requestId = `host-hotspot-recovery-${Date.now()}-${randomUUID()}`
    const requestPath = join(this.requestDir, `${requestId}.json`)
    const payload = {
      requestId,
      requestedAt: new Date().toISOString(),
      source: 'frontend-admin',
      ...input,
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

    return {
      requestId,
      requestPath,
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
