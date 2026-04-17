import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DEFAULT_SYSTEM_UPDATE_REQUEST_DIR = '/var/run/sentinel/system-update/requests'

export interface QueueSystemUpdateRequestInput {
  requestedByMemberId: string
  requestedByMemberName: string
  requestedByRemoteSystemName: string | null
  requestedFromIp: string | null
  requestedFromUserAgent: string | null
  requestedTarget: 'latest'
}

export class SystemUpdateRequestService {
  private readonly requestDir: string

  constructor(
    requestDir: string =
      process.env.SYSTEM_UPDATE_REQUEST_DIR || DEFAULT_SYSTEM_UPDATE_REQUEST_DIR
  ) {
    this.requestDir = requestDir
  }

  async queueLatestUpdateRequest(input: Omit<QueueSystemUpdateRequestInput, 'requestedTarget'>): Promise<{
    requestId: string
    requestPath: string
  }> {
    await mkdir(this.requestDir, { recursive: true })

    const requestId = `system-update-${Date.now()}-${randomUUID()}`
    const requestPath = join(this.requestDir, `${requestId}.json`)
    const payload: QueueSystemUpdateRequestInput & {
      requestId: string
      requestedAt: string
      source: 'frontend-admin'
    } = {
      requestId,
      requestedAt: new Date().toISOString(),
      source: 'frontend-admin',
      requestedTarget: 'latest',
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
