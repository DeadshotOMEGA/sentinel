import type { BadgeAssignmentType } from '@sentinel/types'

export interface BadgeStatusSummary {
  name: string
  chipVariant: string
  chipColor: string
}

const BADGE_STATUS_SUMMARIES: Record<string, BadgeStatusSummary> = {
  active: {
    name: 'Active',
    chipVariant: 'bordered',
    chipColor: 'success',
  },
  damaged: {
    name: 'Damaged',
    chipVariant: 'bordered',
    chipColor: 'warning',
  },
  inactive: {
    name: 'Inactive',
    chipVariant: 'bordered',
    chipColor: 'neutral',
  },
  lost: {
    name: 'Lost',
    chipVariant: 'bordered',
    chipColor: 'warning',
  },
  disabled: {
    name: 'Disabled',
    chipVariant: 'bordered',
    chipColor: 'danger',
  },
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function normalizeBadgeAssignmentType(assignmentType: string): BadgeAssignmentType {
  switch (assignmentType) {
    case 'member':
    case 'visitor':
    case 'event':
    case 'unassigned':
      return assignmentType
    case 'permanent':
      return 'member'
    case 'temporary':
      return 'visitor'
    default:
      return 'unassigned'
  }
}

export function getBadgeStatusSummary(status: string): BadgeStatusSummary {
  const normalizedStatus = status.trim().toLowerCase()
  return (
    BADGE_STATUS_SUMMARIES[normalizedStatus] ?? {
      name: toTitleCase(status),
      chipVariant: 'bordered',
      chipColor: 'default',
    }
  )
}

export function hasValidMemberBadgeAssignment(
  assignmentType: string,
  assignedToId: string | null | undefined,
  memberId: string
): boolean {
  return normalizeBadgeAssignmentType(assignmentType) === 'member' && assignedToId === memberId
}
