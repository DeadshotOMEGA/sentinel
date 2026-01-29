'use client'

import type { UnitEventStatus } from '@sentinel/contracts'

interface EventStatusBadgeProps {
  status: UnitEventStatus
}

const statusVariantMap: Record<UnitEventStatus, string> = {
  draft: 'badge-ghost',
  planned: 'badge-info',
  confirmed: 'badge-primary',
  in_progress: 'badge-warning',
  completed: 'badge-success',
  cancelled: 'badge-error',
  postponed: 'badge-secondary',
}

function formatStatusLabel(status: UnitEventStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const variantClass = statusVariantMap[status]
  const label = formatStatusLabel(status)

  return (
    <span className={`badge badge-sm ${variantClass}`} aria-label={`Status: ${label}`}>
      {label}
    </span>
  )
}
