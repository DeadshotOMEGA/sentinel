import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SystemUpdateTraceResponse } from '@sentinel/contracts'
import { serviceLogger } from '../lib/logger.js'

const DEFAULT_STATE_ROOT = '/var/lib/sentinel/updater'
const TRACE_FILE_NAME = 'update-trace.log'

export class SystemUpdateTraceService {
  private readonly stateRoot: string

  constructor(options?: { stateRoot?: string }) {
    this.stateRoot =
      options?.stateRoot ?? process.env.SYSTEM_UPDATE_STATE_ROOT ?? DEFAULT_STATE_ROOT
  }

  async getTrace(): Promise<SystemUpdateTraceResponse> {
    const tracePath = join(this.stateRoot, TRACE_FILE_NAME)

    try {
      const [content, metadata] = await Promise.all([readFile(tracePath, 'utf-8'), stat(tracePath)])
      return {
        available: content.trim().length > 0,
        path: tracePath,
        content,
        lastModifiedAt: metadata.mtime.toISOString(),
      }
    } catch (error) {
      if (isMissingFileError(error)) {
        return {
          available: false,
          path: tracePath,
          content: '',
          lastModifiedAt: null,
        }
      }

      serviceLogger.warn('Unable to read Sentinel update trace log', {
        path: tracePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new Error(
        `Unable to read update trace log at ${tracePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}
