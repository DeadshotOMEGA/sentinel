import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR =
  '/var/run/sentinel/hotspot-recovery/requests'

export interface QueueHostHotspotRecoveryInput {
  requestedByMemberId: string
  requestedByMemberName: string
  requestedByRemoteSystemName: string | null
  requestedFromIp: string | null
  requestedFromUserAgent: string | null
}

export class HostHotspotRecoveryService {
  private readonly requestDir: string

  constructor(
    requestDir: string =
      process.env.HOST_HOTSPOT_RECOVERY_REQUEST_DIR || DEFAULT_HOST_HOTSPOT_RECOVERY_REQUEST_DIR
  ) {
    this.requestDir = requestDir
  }

  async queueRecoveryRequest(input: QueueHostHotspotRecoveryInput): Promise<{
    requestId: string
    requestPath: string
  }> {
    await mkdir(this.requestDir, { recursive: true })

    const requestId = `host-hotspot-recovery-${Date.now()}-${randomUUID()}`
    const requestPath = join(this.requestDir, `${requestId}.json`)
    const payload = {
      requestId,
      requestedAt: new Date().toISOString(),
      source: 'frontend-admin',
      ...input,
    }

    await writeFile(requestPath, JSON.stringify(payload, null, 2), {
      encoding: 'utf-8',
      flag: 'wx',
    })

    return {
      requestId,
      requestPath,
    }
  }
}
