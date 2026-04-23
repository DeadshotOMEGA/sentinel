import type {
  SystemUpdateCheckpoint,
  SystemUpdateJob,
  SystemUpdateJobStatus,
  SystemUpdatePhase,
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
const PRIMARY_PHASES = [
  {
    key: 'prepare_update',
    label: 'Prepare update',
    description: 'Confirm the requested release and gather trusted metadata.',
    kind: 'primary',
    order: 1,
    total: 5,
  },
  {
    key: 'protect_current_system',
    label: 'Protect current system',
    description: 'Create recovery assets before applying the new release.',
    kind: 'primary',
    order: 2,
    total: 5,
  },
  {
    key: 'install_release',
    label: 'Install release',
    description: 'Download, verify, and install the requested Sentinel package.',
    kind: 'primary',
    order: 3,
    total: 5,
  },
  {
    key: 'bring_services_back',
    label: 'Bring services back',
    description: 'Pull updated images and restart the Sentinel stack.',
    kind: 'primary',
    order: 4,
    total: 5,
  },
  {
    key: 'verify_and_finalize',
    label: 'Verify and finalize',
    description: 'Run health checks and final appliance recovery tasks.',
    kind: 'primary',
    order: 5,
    total: 5,
  },
  {
    key: 'recovery',
    label: 'Recovery',
    description: 'Attempt rollback or point the operator to restore guidance.',
    kind: 'recovery',
    order: 5,
    total: 5,
  },
] as const satisfies readonly SystemUpdatePhase[]
const PHASE_BY_KEY = new Map(PRIMARY_PHASES.map((phase) => [phase.key, phase]))

const CHECKPOINT_BY_STATUS: Record<SystemUpdateJobStatus, SystemUpdateCheckpoint> = {
  idle: {
    key: 'request_accepted',
    label: 'Update request accepted',
    detail: 'The updater has accepted the update request and is waiting to continue.',
  },
  requested: {
    key: 'request_accepted',
    label: 'Update request accepted',
    detail: 'The updater has accepted the update request and is waiting to continue.',
  },
  authorized: {
    key: 'request_authorized',
    label: 'Request authorized',
    detail: 'The requested Sentinel release was validated and authorized to continue.',
  },
  staging: {
    key: 'creating_pre_update_backup',
    label: 'Creating pre-update backup',
    detail: 'Creating Sentinel and Wiki.js backups before any changes are applied.',
  },
  downloading: {
    key: 'downloading_release',
    label: 'Downloading release',
    detail: 'Downloading the requested Sentinel package and release metadata.',
  },
  verifying: {
    key: 'verifying_release_artifacts',
    label: 'Verifying release artifacts',
    detail: 'Checking release checksums and manifests before installation.',
  },
  installing: {
    key: 'installing_package',
    label: 'Installing package',
    detail: 'Installing the requested Sentinel package on the host appliance.',
  },
  post_install: {
    key: 'pulling_container_images',
    label: 'Pulling container images',
    detail: 'Pulling the updated container images for the Sentinel stack.',
  },
  restarting: {
    key: 'restarting_services',
    label: 'Restarting services',
    detail: 'Recreating the Sentinel stack and waiting for containers to report healthy.',
  },
  health_check: {
    key: 'waiting_for_health_endpoint',
    label: 'Waiting for health checks',
    detail: 'Waiting for Sentinel to report healthy at the local health endpoint.',
  },
  completed: {
    key: 'update_completed',
    label: 'Update completed',
    detail: 'Sentinel finished the update and returned to steady state.',
  },
  failed: {
    key: 'update_failed',
    label: 'Update failed',
    detail: 'The update stopped and needs operator attention before retrying.',
  },
  rollback_attempted: {
    key: 'attempting_rollback',
    label: 'Attempting rollback',
    detail: 'Rolling back to the last known good Sentinel release.',
  },
  rolled_back: {
    key: 'rollback_completed',
    label: 'Rollback completed',
    detail: 'Sentinel rolled back to the previous known good release.',
  },
}

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

function derivePhase(status: SystemUpdateJobStatus): SystemUpdatePhase {
  switch (status) {
    case 'requested':
    case 'authorized':
    case 'idle':
      return PHASE_BY_KEY.get('prepare_update')!
    case 'staging':
      return PHASE_BY_KEY.get('protect_current_system')!
    case 'downloading':
    case 'verifying':
    case 'installing':
      return PHASE_BY_KEY.get('install_release')!
    case 'post_install':
    case 'restarting':
      return PHASE_BY_KEY.get('bring_services_back')!
    case 'health_check':
    case 'completed':
      return PHASE_BY_KEY.get('verify_and_finalize')!
    case 'failed':
    case 'rollback_attempted':
    case 'rolled_back':
      return PHASE_BY_KEY.get('recovery')!
  }
}

function parsePhase(value: unknown, status: SystemUpdateJobStatus): SystemUpdatePhase {
  if (!isRecord(value)) {
    return derivePhase(status)
  }

  const key = typeof value.key === 'string' ? value.key.trim() : ''
  const fallback = derivePhase(status)
  const definition = PHASE_BY_KEY.get(key as (typeof PRIMARY_PHASES)[number]['key']) ?? fallback

  const description =
    value.description === null
      ? null
      : typeof value.description === 'string' && value.description.trim().length > 0
        ? value.description.trim()
        : definition.description

  const kind =
    typeof value.kind === 'string' && value.kind.trim().length > 0
      ? value.kind.trim()
      : definition.kind

  const order =
    typeof value.order === 'number' && Number.isInteger(value.order) && value.order > 0
      ? value.order
      : definition.order

  const total =
    typeof value.total === 'number' && Number.isInteger(value.total) && value.total > 0
      ? value.total
      : definition.total

  return {
    key: definition.key,
    label:
      typeof value.label === 'string' && value.label.trim().length > 0
        ? value.label.trim()
        : definition.label,
    description,
    kind,
    order,
    total,
  }
}

function parseCheckpoint(
  value: unknown,
  status: SystemUpdateJobStatus,
  message: string
): SystemUpdateCheckpoint {
  const fallback = CHECKPOINT_BY_STATUS[status]

  if (!isRecord(value)) {
    return {
      ...fallback,
      detail: message.trim().length > 0 ? message : fallback.detail,
    }
  }

  const key =
    typeof value.key === 'string' && value.key.trim().length > 0 ? value.key.trim() : fallback.key
  const label =
    typeof value.label === 'string' && value.label.trim().length > 0
      ? value.label.trim()
      : fallback.label
  const detail =
    typeof value.detail === 'string' && value.detail.trim().length > 0
      ? value.detail.trim()
      : message.trim().length > 0
        ? message
        : fallback.detail

  return {
    key,
    label,
    detail,
  }
}

export function sanitizeSystemUpdateJob(payload: unknown): SystemUpdateJob {
  if (!isRecord(payload)) {
    throw new Error('Updater job payload must be an object.')
  }

  const status = parseJobStatus(payload.status)
  const message = requireString(payload.message, 'message')
  const requestedBy = payload.requestedBy

  if (!isRecord(requestedBy)) {
    throw new Error('Updater job field "requestedBy" was invalid.')
  }

  return {
    jobId: parseJobId(payload.jobId),
    status,
    step: status,
    message,
    requestedAt: requireString(payload.requestedAt, 'requestedAt'),
    startedAt: parseNullableString(payload.startedAt, 'startedAt'),
    finishedAt: parseNullableString(payload.finishedAt, 'finishedAt'),
    currentVersion: parseNullableVersion(payload.currentVersion, 'currentVersion'),
    latestVersion: parseNullableVersion(payload.latestVersion, 'latestVersion'),
    targetVersion: parseVersion(payload.targetVersion, 'targetVersion'),
    phase: parsePhase(payload.phase, status),
    checkpoint: parseCheckpoint(payload.checkpoint, status, message),
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

export function isSystemUpdateJobFinished(
  job: Pick<SystemUpdateJob, 'status' | 'finishedAt'> | null | undefined
): boolean {
  if (!job) {
    return true
  }

  if (job.status === 'rollback_attempted') {
    return job.finishedAt !== null
  }

  return TERMINAL_JOB_STATUSES.has(job.status)
}

export function hasSystemUpdatePermission(accountLevel: number | null | undefined): boolean {
  return (accountLevel ?? 0) >= AccountLevel.ADMIN
}

export function isValidSystemUpdateVersion(value: string): boolean {
  return isStableVersionTag(value)
}
