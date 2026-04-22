import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SystemUpdateJob, SystemUpdateStatusResponse } from '@sentinel/contracts'
import { serviceLogger } from '../lib/logger.js'
import {
  compareVersionTags,
  isStableVersionTag,
  resolveServiceVersionTag,
} from '../lib/service-version.js'
import { isSystemUpdateJobTerminal, sanitizeSystemUpdateJob } from '../lib/system-update-state.js'

const DEFAULT_STATE_ROOT = '/var/lib/sentinel/updater'
const DEFAULT_APPLIANCE_STATE_PATH = '/var/lib/sentinel/appliance/state.json'
const DEFAULT_RELEASE_API_BASE = 'https://api.github.com/repos'

interface LatestReleaseSummary {
  latestVersion: string | null
  latestReleaseUrl: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export class SystemUpdateStatusService {
  private readonly stateRoot: string
  private readonly applianceStatePath: string
  private readonly releaseRepository: string
  private readonly releaseApiBase: string

  constructor(options?: {
    stateRoot?: string
    applianceStatePath?: string
    releaseRepository?: string
    releaseApiBase?: string
  }) {
    this.stateRoot =
      options?.stateRoot ?? process.env.SYSTEM_UPDATE_STATE_ROOT ?? DEFAULT_STATE_ROOT
    this.applianceStatePath =
      options?.applianceStatePath ??
      process.env.SENTINEL_APPLIANCE_STATE ??
      DEFAULT_APPLIANCE_STATE_PATH
    this.releaseRepository =
      options?.releaseRepository ??
      process.env.SYSTEM_UPDATE_RELEASE_REPOSITORY ??
      `${process.env.GHCR_OWNER?.trim() || 'deadshotomega'}/sentinel`
    this.releaseApiBase =
      options?.releaseApiBase ??
      process.env.SYSTEM_UPDATE_RELEASE_API_BASE ??
      DEFAULT_RELEASE_API_BASE
  }

  async getStatus(): Promise<SystemUpdateStatusResponse> {
    const applianceStateVersion = await this.readApplianceCurrentVersion()
    const currentJob = this.filterSupersededTerminalJob(
      await this.readCurrentJob(),
      applianceStateVersion
    )
    const releaseSummary = await this.fetchLatestReleaseSummary()
    const completedJobVersion =
      currentJob && isSystemUpdateJobTerminal(currentJob.status) ? currentJob.currentVersion : null
    const currentVersion =
      applianceStateVersion ??
      completedJobVersion ??
      resolveServiceVersionTag() ??
      currentJob?.currentVersion ??
      null
    const latestVersion = releaseSummary.latestVersion ?? currentJob?.latestVersion ?? null

    return {
      currentVersion,
      latestVersion,
      latestReleaseUrl: releaseSummary.latestReleaseUrl,
      updateAvailable:
        currentVersion !== null &&
        latestVersion !== null &&
        compareVersionTags(currentVersion, latestVersion) < 0,
      currentJob,
    }
  }

  private filterSupersededTerminalJob(
    currentJob: SystemUpdateJob | null,
    applianceStateVersion: string | null
  ): SystemUpdateJob | null {
    if (!currentJob || !applianceStateVersion || !isSystemUpdateJobTerminal(currentJob.status)) {
      return currentJob
    }

    const terminalJobVersion = this.resolveTerminalJobVersion(currentJob)
    if (terminalJobVersion === null) {
      return currentJob
    }

    if (compareVersionTags(terminalJobVersion, applianceStateVersion) === 0) {
      return currentJob
    }

    serviceLogger.warn(
      'Ignoring stale terminal Sentinel updater job that no longer matches the appliance version',
      {
        jobId: currentJob.jobId,
        jobStatus: currentJob.status,
        terminalJobVersion,
        applianceStateVersion,
      }
    )
    return null
  }

  private resolveTerminalJobVersion(currentJob: SystemUpdateJob): string | null {
    if (currentJob.currentVersion) {
      return currentJob.currentVersion
    }

    return currentJob.status === 'completed' ? currentJob.targetVersion : null
  }

  async getJob(jobId: string): Promise<SystemUpdateJob | null> {
    return this.readJobFromPath(join(this.stateRoot, 'jobs', `${jobId}.json`))
  }

  private async readCurrentJob(): Promise<SystemUpdateJob | null> {
    return this.readJobFromPath(join(this.stateRoot, 'current-job.json'))
  }

  private async readJobFromPath(path: string): Promise<SystemUpdateJob | null> {
    let rawText: string

    try {
      rawText = await readFile(path, 'utf-8')
    } catch (error) {
      if (isMissingFileError(error)) {
        return null
      }

      throw error
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawText)
    } catch (error) {
      throw new Error(
        `Unable to parse updater job state at ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return sanitizeSystemUpdateJob(payload)
  }

  private async fetchLatestReleaseSummary(): Promise<LatestReleaseSummary> {
    const repository = this.releaseRepository.trim()
    if (repository.length === 0) {
      return {
        latestVersion: null,
        latestReleaseUrl: null,
      }
    }

    try {
      const response = await globalThis.fetch(
        `${this.releaseApiBase.replace(/\/+$/, '')}/${repository}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'sentinel-backend/system-update-status',
          },
          signal: globalThis.AbortSignal.timeout(10_000),
        }
      )

      if (!response.ok) {
        serviceLogger.warn('Latest Sentinel release lookup failed', {
          repository,
          status: response.status,
        })

        return {
          latestVersion: null,
          latestReleaseUrl: null,
        }
      }

      const payload: unknown = await response.json()
      if (!isRecord(payload)) {
        return {
          latestVersion: null,
          latestReleaseUrl: null,
        }
      }

      const tagName = typeof payload.tag_name === 'string' ? payload.tag_name.trim() : ''
      const latestVersion = isStableVersionTag(tagName) ? tagName : null
      const latestReleaseUrl = typeof payload.html_url === 'string' ? payload.html_url : null

      return {
        latestVersion,
        latestReleaseUrl,
      }
    } catch (error) {
      serviceLogger.warn('Latest Sentinel release lookup raised an error', {
        repository,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        latestVersion: null,
        latestReleaseUrl: null,
      }
    }
  }

  private async readApplianceCurrentVersion(): Promise<string | null> {
    let rawText: string

    try {
      rawText = await readFile(this.applianceStatePath, 'utf-8')
    } catch (error) {
      if (isMissingFileError(error)) {
        return null
      }

      serviceLogger.warn('Unable to read Sentinel appliance state', {
        path: this.applianceStatePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }

    try {
      const payload: unknown = JSON.parse(rawText)
      if (!isRecord(payload)) {
        return null
      }

      const currentVersion =
        typeof payload.currentVersion === 'string' ? payload.currentVersion.trim() : ''
      return isStableVersionTag(currentVersion) ? currentVersion : null
    } catch (error) {
      serviceLogger.warn('Unable to parse Sentinel appliance state', {
        path: this.applianceStatePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
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
