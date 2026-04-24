import type { SystemStatusResponse, SystemUpdateStatusResponse } from '@sentinel/contracts'
import {
  hasHotspotWarning,
  isSystemUpdateJobTerminal,
} from '../components/settings/system-update-panel.logic'

export type AdminIssueTone = 'error' | 'warning'
export type AdminIssueRouteId = 'updates' | 'network' | 'logs' | 'database' | 'badges'

export interface AdminIssue {
  id: string
  tone: AdminIssueTone
  title: string
  detail: string
  href: `/admin/${string}`
  routeId: AdminIssueRouteId
  priority: number
}

export function getAdminRecentIssues(input: {
  systemStatus: SystemStatusResponse | null
  systemStatusError: boolean
  updateStatus: SystemUpdateStatusResponse | null
  updateStatusError: boolean
}): readonly AdminIssue[] {
  const issues: AdminIssue[] = []

  if (input.systemStatusError) {
    issues.push({
      id: 'system-status-unavailable',
      tone: 'error',
      title: 'System status unavailable',
      detail: 'Sentinel could not load appliance health from the backend.',
      href: '/admin/logs',
      routeId: 'logs',
      priority: 100,
    })
  }

  if (input.updateStatusError) {
    issues.push({
      id: 'update-status-unavailable',
      tone: 'warning',
      title: 'Update status unavailable',
      detail: 'The updater status endpoint did not respond cleanly.',
      href: '/admin/updates',
      routeId: 'updates',
      priority: 82,
    })
  }

  const systemStatus = input.systemStatus
  if (systemStatus) {
    if (systemStatus.backend.status !== 'healthy') {
      issues.push({
        id: 'backend-unhealthy',
        tone: 'error',
        title: 'Backend API unhealthy',
        detail: 'Core Sentinel API checks are not healthy.',
        href: '/admin/logs',
        routeId: 'logs',
        priority: 98,
      })
    }

    if (!systemStatus.database.healthy) {
      issues.push({
        id: 'database-unhealthy',
        tone: 'error',
        title: 'Database health check failed',
        detail: systemStatus.database.address
          ? `Database probe failed for ${systemStatus.database.address}.`
          : 'The database health probe failed.',
        href: '/admin/database',
        routeId: 'database',
        priority: 96,
      })
    }

    if (systemStatus.network.status === 'error' || systemStatus.network.status === 'warning') {
      issues.push({
        id: 'network-degraded',
        tone: systemStatus.network.status === 'error' ? 'error' : 'warning',
        title: 'Network needs attention',
        detail: systemStatus.network.message,
        href: '/admin/network',
        routeId: 'network',
        priority: systemStatus.network.status === 'error' ? 94 : 78,
      })
    } else if (hasHotspotWarning(systemStatus)) {
      issues.push({
        id: 'hotspot-warning',
        tone: 'warning',
        title: 'Hotspot profile needs attention',
        detail: systemStatus.network.message,
        href: '/admin/network',
        routeId: 'network',
        priority: 76,
      })
    }
  }

  const updateStatus = input.updateStatus
  const currentJob = updateStatus?.currentJob ?? null
  if (currentJob && !isSystemUpdateJobTerminal(currentJob)) {
    issues.push({
      id: 'update-in-progress',
      tone: 'warning',
      title: 'Update in progress',
      detail: `${currentJob.phase.label}: ${currentJob.checkpoint.label}`,
      href: '/admin/updates',
      routeId: 'updates',
      priority: 74,
    })
  } else if (currentJob?.status === 'failed' || currentJob?.status === 'rollback_attempted') {
    issues.push({
      id: 'update-failed',
      tone: 'error',
      title: 'Last update failed',
      detail: currentJob.failureSummary ?? currentJob.message,
      href: '/admin/updates',
      routeId: 'updates',
      priority: 92,
    })
  } else if (updateStatus?.updateAvailable) {
    issues.push({
      id: 'update-available',
      tone: 'warning',
      title: 'Update available',
      detail: updateStatus.latestVersion
        ? `${updateStatus.latestVersion} is ready to install.`
        : 'A newer Sentinel release is ready.',
      href: '/admin/updates',
      routeId: 'updates',
      priority: 62,
    })
  }

  return issues.sort((left, right) => right.priority - left.priority)
}
