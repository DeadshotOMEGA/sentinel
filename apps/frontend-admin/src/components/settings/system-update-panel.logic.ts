import type {
  SystemUpdateCheckpoint,
  SystemUpdateJob,
  SystemUpdateStatusResponse,
} from '@sentinel/contracts'

const RETRYABLE_STATUSES = new Set<SystemUpdateJob['status']>([
  'failed',
  'rollback_attempted',
  'rolled_back',
])

type PrimaryPhaseKey =
  | 'prepare_update'
  | 'protect_current_system'
  | 'install_release'
  | 'bring_services_back'
  | 'verify_and_finalize'

interface PrimaryPhaseDefinition {
  key: PrimaryPhaseKey
  label: string
  description: string
}

const PRIMARY_PHASES: readonly PrimaryPhaseDefinition[] = [
  {
    key: 'prepare_update',
    label: 'Prepare update',
    description: 'Confirm the requested release and gather trusted metadata.',
  },
  {
    key: 'protect_current_system',
    label: 'Protect current system',
    description: 'Create recovery assets before applying the new release.',
  },
  {
    key: 'install_release',
    label: 'Install release',
    description: 'Download, verify, and install the requested Sentinel package.',
  },
  {
    key: 'bring_services_back',
    label: 'Bring services back',
    description: 'Pull updated images and restart the Sentinel stack.',
  },
  {
    key: 'verify_and_finalize',
    label: 'Verify and finalize',
    description: 'Run health checks and final appliance recovery tasks.',
  },
] as const
export type SystemUpdatePhaseViewState = 'complete' | 'active' | 'pending'

export interface SystemUpdatePhaseView {
  key: PrimaryPhaseKey
  label: string
  description: string
  state: SystemUpdatePhaseViewState
  caption: string
}

function compareVersionTags(left: string, right: string): number {
  const parse = (tag: string): [number, number, number] => {
    const cleaned = tag.startsWith('v') ? tag.slice(1) : tag
    const [majorRaw, minorRaw, patchRaw] = cleaned.split('.')

    const major = Number.parseInt(majorRaw ?? '0', 10)
    const minor = Number.parseInt(minorRaw ?? '0', 10)
    const patch = Number.parseInt(patchRaw ?? '0', 10)

    return [
      Number.isNaN(major) ? 0 : major,
      Number.isNaN(minor) ? 0 : minor,
      Number.isNaN(patch) ? 0 : patch,
    ]
  }

  const leftParts = parse(left)
  const rightParts = parse(right)

  for (let index = 0; index < leftParts.length; index += 1) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]
    if (leftPart === undefined || rightPart === undefined) {
      continue
    }

    const delta = leftPart - rightPart
    if (delta !== 0) {
      return delta
    }
  }

  return 0
}

export function formatSystemUpdateStatusLabel(status: SystemUpdateJob['status']): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function isSystemUpdateJobTerminal(job: SystemUpdateJob | null): boolean {
  if (!job) {
    return true
  }

  if (job.status === 'rollback_attempted') {
    return job.finishedAt !== null
  }

  return job.status === 'completed' || job.status === 'failed' || job.status === 'rolled_back'
}

export function isSystemUpdateJobFailure(job: SystemUpdateJob | null): boolean {
  if (!job) {
    return false
  }

  return (
    job.status === 'failed' || job.status === 'rollback_attempted' || job.status === 'rolled_back'
  )
}

function findPrimaryPhaseIndex(job: SystemUpdateJob | null): number {
  if (!job) {
    return -1
  }

  if (job.phase.kind === 'primary') {
    return PRIMARY_PHASES.findIndex((phase) => phase.key === job.phase.key)
  }

  if (
    job.status === 'completed' ||
    job.status === 'rollback_attempted' ||
    job.status === 'rolled_back'
  ) {
    return PRIMARY_PHASES.length - 1
  }

  return -1
}

export function getSystemUpdatePhaseProgress(job: SystemUpdateJob | null): SystemUpdatePhaseView[] {
  const activeIndex = findPrimaryPhaseIndex(job)
  const isTerminal = isSystemUpdateJobTerminal(job)

  return PRIMARY_PHASES.map((phase, index) => {
    const isActive =
      job !== null && !isTerminal && job.phase.kind === 'primary' && phase.key === job.phase.key

    const isComplete =
      job !== null &&
      (job.status === 'completed'
        ? index <= activeIndex
        : job.phase.kind === 'recovery'
          ? index <= activeIndex
          : index < activeIndex)

    let caption = phase.description
    if (isActive) {
      caption = job.checkpoint.detail
    } else if (isComplete) {
      caption = 'Completed'
    }

    return {
      key: phase.key,
      label: phase.label,
      description: phase.description,
      state: isActive ? 'active' : isComplete ? 'complete' : 'pending',
      caption,
    }
  })
}

export function getSystemUpdateActiveCheckpoint(
  job: SystemUpdateJob | null
): SystemUpdateCheckpoint | null {
  return job?.checkpoint ?? null
}

export function getRetryableTargetVersion(
  currentJob: SystemUpdateJob | null,
  currentVersion: string | null
): string | null {
  if (!currentJob || !RETRYABLE_STATUSES.has(currentJob.status)) {
    return null
  }

  if (!currentVersion) {
    return currentJob.targetVersion
  }

  return compareVersionTags(currentJob.targetVersion, currentVersion) > 0
    ? currentJob.targetVersion
    : null
}

export function getPreferredUpdateTargetVersion(
  status: Pick<SystemUpdateStatusResponse, 'currentVersion' | 'latestVersion'>,
  currentJob: SystemUpdateJob | null
): string | null {
  return status.latestVersion ?? getRetryableTargetVersion(currentJob, status.currentVersion)
}
