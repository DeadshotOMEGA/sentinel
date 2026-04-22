import type {
  SystemUpdateJob,
  SystemUpdateJobStatus,
  SystemUpdateVersion,
} from '@sentinel/contracts'
import { AccountLevel } from '../middleware/roles.js'
import { isStableVersionTag } from './service-version.js'

const JOB_ID_PATTERN = /^system-update-[0-9]{13}-[0-9a-f-]{36}$/
const JOB_STATUSES: readonly SystemUpdateJobStatus[] = [
  'idle',
  'requested',
  'authorized',
  'staging',
  'downloading',
  'verifying',
  'installing',
  'post_install',
  'restarting',
  'health_check',
  'completed',
  'failed',
  'rollback_attempted',
  'rolled_back',
]

const TERMINAL_JOB_STATUSES = new Set<SystemUpdateJobStatus>([
  'completed',
  'failed',
  'rollback_attempted',
  'rolled_back',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Updater job field "${fieldName}" must be a non-empty string.`)
  }

  return value
}

function parseNullableString(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`Updater job field "${fieldName}" must be a string or null.`)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseNullableNumber(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Updater job field "${fieldName}" must be a number or null.`)
  }

  return value
}

function parseJobStatus(value: unknown): SystemUpdateJobStatus {
  if (typeof value !== 'string' || !JOB_STATUSES.includes(value as SystemUpdateJobStatus)) {
    throw new Error('Updater job field "status" was invalid.')
  }

  return value as SystemUpdateJobStatus
}

function parseJobId(value: unknown): string {
  const jobId = requireString(value, 'jobId')
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new Error('Updater job field "jobId" was invalid.')
  }

  return jobId
}

function parseVersion(value: unknown, fieldName: string): SystemUpdateVersion {
  const version = requireString(value, fieldName)
  if (!isStableVersionTag(version)) {
    throw new Error(`Updater job field "${fieldName}" must be in vX.Y.Z format.`)
  }

  return version
}

function parseNullableVersion(value: unknown, fieldName: string): SystemUpdateVersion | null {
  const version = parseNullableString(value, fieldName)
  if (version === null) {
    return null
  }

  if (!isStableVersionTag(version)) {
    throw new Error(`Updater job field "${fieldName}" must be in vX.Y.Z format.`)
  }

  return version
}

export function sanitizeSystemUpdateJob(payload: unknown): SystemUpdateJob {
  if (!isRecord(payload)) {
    throw new Error('Updater job payload must be an object.')
  }

  const status = parseJobStatus(payload.status)
  const requestedBy = payload.requestedBy

  if (!isRecord(requestedBy)) {
    throw new Error('Updater job field "requestedBy" was invalid.')
  }

  return {
    jobId: parseJobId(payload.jobId),
    status,
    step: status,
    message: requireString(payload.message, 'message'),
    requestedAt: requireString(payload.requestedAt, 'requestedAt'),
    startedAt: parseNullableString(payload.startedAt, 'startedAt'),
    finishedAt: parseNullableString(payload.finishedAt, 'finishedAt'),
    currentVersion: parseNullableVersion(payload.currentVersion, 'currentVersion'),
    latestVersion: parseNullableVersion(payload.latestVersion, 'latestVersion'),
    targetVersion: parseVersion(payload.targetVersion, 'targetVersion'),
    failureSummary: parseNullableString(payload.failureSummary, 'failureSummary'),
    rollbackAttempted: Boolean(payload.rollbackAttempted),
    requestedBy: {
      memberId: requireString(requestedBy.memberId, 'requestedBy.memberId'),
      memberName: requireString(requestedBy.memberName, 'requestedBy.memberName'),
      accountLevel: parseNullableNumber(requestedBy.accountLevel, 'requestedBy.accountLevel'),
      fromIp: parseNullableString(requestedBy.fromIp, 'requestedBy.fromIp'),
    },
  }
}

export function isSystemUpdateJobTerminal(status: SystemUpdateJobStatus): boolean {
  return TERMINAL_JOB_STATUSES.has(status)
}

export function hasSystemUpdatePermission(accountLevel: number | null | undefined): boolean {
  return (accountLevel ?? 0) >= AccountLevel.ADMIN
}

export function isValidSystemUpdateVersion(value: string): boolean {
  return isStableVersionTag(value)
}
