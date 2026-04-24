import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SystemUpdateTraceResponse } from '@sentinel/contracts'
import { serviceLogger } from '../lib/logger.js'

const DEFAULT_STATE_ROOT = '/var/lib/sentinel/updater'
const TRACE_FILE_NAME = 'update-trace.log'
const TRACE_RUN_START_PATTERNS: readonly RegExp[] = [
  /\] Accepted a new Sentinel update request\b/,
  /\] Starting update trace session\b/,
  /\] Update trace session started\b/,
  /\] Starting rollback to\b/,
  /\] Starting pre-update backup\b/,
  /\] Starting restore\b/,
]
const TRACE_DISPLAY_FILTER_PATTERNS: readonly RegExp[] = [
  /\] stderr: [0-9a-f]{12,64} Extracting\s+\S+\s*$/i,
]

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
      const traceView = getLatestTraceRunView(content)
      return {
        available: traceView.content.trim().length > 0,
        path: tracePath,
        content: traceView.content,
        displayedLineCount: traceView.displayedLineCount,
        filteredLineCount: traceView.filteredLineCount,
        totalLineCount: traceView.totalLineCount,
        truncatedToLatestRun: traceView.truncatedToLatestRun,
        lastModifiedAt: metadata.mtime.toISOString(),
      }
    } catch (error) {
      if (isMissingFileError(error)) {
        return {
          available: false,
          path: tracePath,
          content: '',
          displayedLineCount: 0,
          filteredLineCount: 0,
          totalLineCount: 0,
          truncatedToLatestRun: false,
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

function getLatestTraceRunView(content: string): {
  content: string
  displayedLineCount: number
  filteredLineCount: number
  totalLineCount: number
  truncatedToLatestRun: boolean
} {
  const hasTrailingNewline = content.endsWith('\n')
  const lines = content.split('\n')
  if (hasTrailingNewline) {
    lines.pop()
  }

  const totalLineCount = lines.length
  let latestRunStartIndex = -1

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (line !== undefined && TRACE_RUN_START_PATTERNS.some((pattern) => pattern.test(line))) {
      latestRunStartIndex = index
      break
    }
  }

  const latestRunLines = latestRunStartIndex > 0 ? lines.slice(latestRunStartIndex) : lines
  const displayedLines = latestRunLines.filter(
    (line) => !TRACE_DISPLAY_FILTER_PATTERNS.some((pattern) => pattern.test(line))
  )
  const filteredLineCount = latestRunLines.length - displayedLines.length
  const displayedContent =
    displayedLines.length === 0
      ? ''
      : `${displayedLines.join('\n')}${hasTrailingNewline ? '\n' : ''}`

  return {
    content: displayedContent,
    displayedLineCount: displayedLines.length,
    filteredLineCount,
    totalLineCount,
    truncatedToLatestRun: latestRunStartIndex > 0,
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
