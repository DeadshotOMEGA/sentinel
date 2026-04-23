import type { SystemUpdateJob, SystemUpdateStatusResponse } from '@sentinel/contracts'

const RETRYABLE_STATUSES = new Set<SystemUpdateJob['status']>([
  'failed',
  'rollback_attempted',
  'rolled_back',
])

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
