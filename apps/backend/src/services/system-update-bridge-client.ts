import net from 'node:net'
import type { SystemUpdateJob } from '@sentinel/contracts'
import { sanitizeSystemUpdateJob } from '../lib/system-update-state.js'

const DEFAULT_BRIDGE_SOCKET_PATH = '/run/sentinel/update-bridge.sock'
const MAX_RESPONSE_BYTES = 64 * 1024

interface StartUpdateRequest {
  jobId: string
  targetVersion: string
  requestedByAccountLevel: number
  requestedByMemberId: string
  requestedByMemberName: string
  requestedFromIp: string | null
}

interface StartUpdateResult {
  message: string
  job: SystemUpdateJob
}

interface BridgeResponseShape {
  status?: unknown
  success?: unknown
  message?: unknown
  job?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export class SystemUpdateBridgeClientError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'SystemUpdateBridgeClientError'
    this.statusCode = statusCode
  }
}

export class SystemUpdateBridgeClient {
  private readonly socketPath: string
  private readonly timeoutMs: number

  constructor(options?: { socketPath?: string; timeoutMs?: number }) {
    this.socketPath =
      options?.socketPath ??
      process.env.SYSTEM_UPDATE_BRIDGE_SOCKET_PATH ??
      DEFAULT_BRIDGE_SOCKET_PATH
    this.timeoutMs = options?.timeoutMs ?? 10_000
  }

  async startUpdate(request: StartUpdateRequest): Promise<StartUpdateResult> {
    const payload = JSON.stringify(request)

    return new Promise<StartUpdateResult>((resolve, reject) => {
      const client = net.createConnection(this.socketPath)
      const chunks: Buffer[] = []
      let responseBytes = 0
      let settled = false

      const timeout = setTimeout(() => {
        client.destroy()
        reject(new SystemUpdateBridgeClientError('Timed out waiting for the update bridge.', 500))
      }, this.timeoutMs)

      const finish = (handler: () => void) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeout)
        handler()
      }

      client.on('connect', () => {
        client.end(payload)
      })

      client.on('data', (chunk) => {
        responseBytes += chunk.byteLength
        if (responseBytes > MAX_RESPONSE_BYTES) {
          finish(() => {
            client.destroy()
            reject(
              new SystemUpdateBridgeClientError(
                'Update bridge response exceeded the maximum size.',
                500
              )
            )
          })
          return
        }

        chunks.push(chunk)
      })

      client.on('end', () => {
        finish(() => {
          const rawResponse = Buffer.concat(chunks).toString('utf-8')
          if (rawResponse.trim().length === 0) {
            reject(
              new SystemUpdateBridgeClientError('Update bridge returned an empty response.', 500)
            )
            return
          }

          let parsed: unknown
          try {
            parsed = JSON.parse(rawResponse)
          } catch (error) {
            reject(
              new SystemUpdateBridgeClientError(
                `Update bridge returned invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
              )
            )
            return
          }

          if (!isRecord(parsed)) {
            reject(
              new SystemUpdateBridgeClientError('Update bridge returned an invalid response.', 500)
            )
            return
          }

          const response = parsed as BridgeResponseShape
          const statusCode = typeof response.status === 'number' ? response.status : 500
          const message =
            typeof response.message === 'string' && response.message.trim().length > 0
              ? response.message
              : 'The update bridge did not provide a message.'

          if (statusCode !== 202 || response.success !== true || !('job' in response)) {
            reject(new SystemUpdateBridgeClientError(message, statusCode))
            return
          }

          try {
            resolve({
              message,
              job: sanitizeSystemUpdateJob(response.job),
            })
          } catch (error) {
            reject(
              new SystemUpdateBridgeClientError(
                `Update bridge returned invalid job data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
              )
            )
          }
        })
      })

      client.on('error', (error) => {
        finish(() => {
          reject(
            new SystemUpdateBridgeClientError(
              `Unable to reach the update bridge: ${error.message}`,
              500
            )
          )
        })
      })
    })
  }
}
