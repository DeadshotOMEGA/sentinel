'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SystemStatusResponse, SystemUpdateStatusResponse } from '@sentinel/contracts'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  Monitor,
  Pin,
  PinOff,
  RefreshCw,
  Shield,
  Wifi,
} from 'lucide-react'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import {
  formatSystemUpdateStatusLabel,
  isSystemUpdateJobTerminal,
} from '@/components/settings/system-update-panel.logic'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { AdminIcon } from '@/components/admin/admin-icons'
import { useAuditActivityFeed } from '@/hooks/use-audit-activity'
import { useBadgeStats } from '@/hooks/use-badges'
import { useSecurityAlerts } from '@/hooks/use-security-alerts'
import { useSystemStatus } from '@/hooks/use-system-status'
import { useSystemUpdateStatus } from '@/hooks/use-system-update'
import {
  addRecentAdminQuickAction,
  ADMIN_QUICK_ACTION_STORAGE_KEY,
  composeAdminQuickActionsForDisplay,
  getAdminQuickActionsByIds,
  parseStoredAdminQuickActions,
  serializeStoredAdminQuickActions,
  type StoredAdminQuickActions,
} from '@/lib/admin-quick-actions'
import { getAdminRecentIssues, type AdminIssue } from '@/lib/admin-issues'
import { recordAdminNavigationTelemetry } from '@/lib/admin-navigation-telemetry'
import {
  ADMIN_QUICK_ACTIONS,
  hasAdminQuickActionAccess,
  type AdminQuickAction,
  type AdminQuickActionId,
  type AdminRouteId,
} from '@/lib/admin-routes'
import { cn } from '@/lib/utils'
import { AccountLevel, useAuthStore } from '@/store/auth-store'

const issueToneBadgeStatus: Record<AdminIssue['tone'], AppBadgeStatus> = {
  error: 'error',
  warning: 'warning',
}

const issueToneSurfaceClasses: Record<AdminIssue['tone'], string> = {
  error: 'border-error/55 bg-error-fadded text-error-fadded-content',
  warning: 'border-warning/60 bg-warning-fadded text-warning-fadded-content',
}

type OperatorContextIconKey = 'workstation' | 'role' | 'wifi' | 'session' | 'database' | 'refresh'

interface AdminTelemetryValue {
  value: string
  detail: string
  badge: string
  badgeStatus: AppBadgeStatus
}

interface OperatorContextRow {
  icon: OperatorContextIconKey
  label: string
  value: string
  badge: string
  badgeStatus: AppBadgeStatus
}

interface SnapshotTelemetryRow {
  label: string
  value: string
  detail: string
  badge: string
  badgeStatus: AppBadgeStatus
}

interface ActionableSignal {
  id: string
  label: string
  value: string
  detail: string
  href: string
  routeId: AdminRouteId
  badge: string
  badgeStatus: AppBadgeStatus
}

interface LastAdminChange {
  timestamp: string
  title: string
  detail: string
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value)

  if (Number.isNaN(timestamp.getTime())) {
    return value
  }

  return timestamp.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatUptime(uptimeSeconds: number | null | undefined): string {
  if (uptimeSeconds === null || uptimeSeconds === undefined) {
    return 'Unknown'
  }

  const totalSeconds = Math.max(0, Math.floor(uptimeSeconds))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function formatStatusLabel(status: string): string {
  return status
    .split(/[_-]+/g)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function getStatusBadge(value: string): AppBadgeStatus {
  const normalizedValue = value.toLowerCase()

  if (
    normalizedValue.includes('unhealthy') ||
    normalizedValue.includes('attention') ||
    normalizedValue.includes('warning') ||
    normalizedValue.includes('error') ||
    normalizedValue.includes('degraded')
  ) {
    return 'warning'
  }

  if (
    normalizedValue.includes('approved') ||
    normalizedValue.includes('authenticated') ||
    normalizedValue.includes('connected') ||
    normalizedValue.includes('current') ||
    normalizedValue.includes('online') ||
    normalizedValue.includes('ready')
  ) {
    return 'success'
  }

  return 'neutral'
}

function OperatorContextIcon({ icon }: { icon: OperatorContextIconKey }) {
  switch (icon) {
    case 'workstation':
      return <Monitor className="h-4 w-4" aria-hidden="true" />
    case 'role':
      return <Shield className="h-4 w-4" aria-hidden="true" />
    case 'wifi':
      return <Wifi className="h-4 w-4" aria-hidden="true" />
    case 'session':
      return <Clock3 className="h-4 w-4" aria-hidden="true" />
    case 'database':
      return <Database className="h-4 w-4" aria-hidden="true" />
    case 'refresh':
      return <RefreshCw className="h-4 w-4" aria-hidden="true" />
  }
}

function getAccountLevelLabel(accountLevel: number): string {
  if (accountLevel >= AccountLevel.DEVELOPER) return 'Developer'
  if (accountLevel >= AccountLevel.ADMIN) return 'Admin'
  if (accountLevel >= AccountLevel.COMMAND) return 'Command'
  if (accountLevel >= AccountLevel.LOCKUP) return 'Lockup'
  if (accountLevel >= AccountLevel.QUARTERMASTER) return 'Quartermaster'
  if (accountLevel >= AccountLevel.BASIC) return 'Basic'

  return 'Guest'
}

function getApprovedWifiTelemetry(
  network: SystemStatusResponse['network'] | null
): AdminTelemetryValue {
  if (!network) {
    return {
      value: 'Not loaded',
      detail: 'Waiting for host telemetry.',
      badge: 'Pending',
      badgeStatus: 'neutral',
    }
  }

  if (network.approvedSsids.length === 0) {
    return {
      value: 'No approved SSID',
      detail: 'Approved network list is not configured.',
      badge: 'Config',
      badgeStatus: 'neutral',
    }
  }

  if (network.wifiConnected === false) {
    return {
      value: 'Wi-Fi disconnected',
      detail: `Expected ${network.approvedSsids[0] ?? 'approved network'}.`,
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  if (network.approvedSsid === true) {
    return {
      value: network.currentSsid ?? network.approvedSsids[0] ?? 'Approved network',
      detail: 'Current workstation is on an approved network.',
      badge: 'Approved',
      badgeStatus: 'success',
    }
  }

  if (network.approvedSsid === false) {
    return {
      value: network.currentSsid ?? 'Wrong SSID',
      detail: `Expected ${network.approvedSsids[0] ?? 'approved network'}.`,
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  return {
    value: network.currentSsid ?? 'Unverified',
    detail: 'Wi-Fi approval could not be confirmed.',
    badge: 'Unknown',
    badgeStatus: 'neutral',
  }
}

function getBackendApiTelemetry(
  backend: SystemStatusResponse['backend'] | null
): AdminTelemetryValue {
  if (!backend) {
    return {
      value: 'Unavailable',
      detail: 'System status has not loaded.',
      badge: 'Unknown',
      badgeStatus: 'neutral',
    }
  }

  if (backend.status !== 'healthy') {
    return {
      value: 'API unavailable',
      detail: `${backend.environment} runtime · ${formatUptime(backend.uptimeSeconds)} uptime`,
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  return {
    value: `API ${backend.version}`,
    detail: `${backend.environment} runtime · ${formatUptime(backend.uptimeSeconds)} uptime`,
    badge: 'Online',
    badgeStatus: 'success',
  }
}

function getDatabaseTelemetry(
  database: SystemStatusResponse['database'] | null
): AdminTelemetryValue {
  if (!database) {
    return {
      value: 'Unavailable',
      detail: 'Database probe has not loaded.',
      badge: 'Unknown',
      badgeStatus: 'neutral',
    }
  }

  return {
    value: database.healthy ? 'Connected' : 'Probe failed',
    detail: database.address ?? 'Database address is hidden.',
    badge: database.healthy ? 'Ready' : 'Check',
    badgeStatus: database.healthy ? 'success' : 'warning',
  }
}

function getNetworkTelemetry(network: SystemStatusResponse['network'] | null): AdminTelemetryValue {
  if (!network) {
    return {
      value: 'Unavailable',
      detail: 'Network telemetry has not loaded.',
      badge: 'Unknown',
      badgeStatus: 'neutral',
    }
  }

  const value =
    network.status === 'healthy'
      ? 'Connected'
      : network.status === 'unknown'
        ? 'Unverified'
        : formatStatusLabel(network.status)

  return {
    value,
    detail: network.message,
    badge: network.status === 'healthy' ? 'Ready' : network.status === 'unknown' ? 'Info' : 'Check',
    badgeStatus: getStatusBadge(value),
  }
}

function getUpdateTelemetry(updateStatus: SystemUpdateStatusResponse | null): AdminTelemetryValue {
  const currentJob = updateStatus?.currentJob ?? null

  if (!updateStatus) {
    return {
      value: 'Unknown',
      detail: 'Update status has not loaded.',
      badge: 'Unknown',
      badgeStatus: 'neutral',
    }
  }

  if (currentJob && !isSystemUpdateJobTerminal(currentJob)) {
    return {
      value: formatSystemUpdateStatusLabel(currentJob.status),
      detail: `${currentJob.phase.label}: ${currentJob.checkpoint.label}`,
      badge: 'Active',
      badgeStatus: 'info',
    }
  }

  if (currentJob?.status === 'failed' || currentJob?.status === 'rollback_attempted') {
    return {
      value: 'Last run failed',
      detail: currentJob.failureSummary ?? currentJob.message,
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  if (updateStatus.updateAvailable) {
    return {
      value: updateStatus.latestVersion ? `Update ${updateStatus.latestVersion}` : 'Update ready',
      detail: `Installed ${updateStatus.currentVersion ?? 'Unknown'}.`,
      badge: 'Ready',
      badgeStatus: 'info',
    }
  }

  return {
    value: updateStatus.currentVersion ?? 'Current',
    detail: 'No pending update action.',
    badge: 'Current',
    badgeStatus: 'success',
  }
}

function getBadgeStagingTelemetry(input: {
  total: number | null
  unassigned: number | null
}): AdminTelemetryValue {
  if (input.unassigned === null) {
    return {
      value: 'Unknown',
      detail: 'Badge inventory has not loaded.',
      badge: 'Unknown',
      badgeStatus: 'neutral',
    }
  }

  return {
    value: `${input.unassigned} unassigned`,
    detail:
      input.total === null ? 'Total inventory unavailable.' : `${input.total} managed badges.`,
    badge: input.unassigned > 0 ? 'Staged' : 'Clear',
    badgeStatus: input.unassigned > 0 ? 'info' : 'success',
  }
}

function getUpdateActionableSignal(
  updateStatus: SystemUpdateStatusResponse | null
): ActionableSignal {
  const currentJob = updateStatus?.currentJob ?? null

  if (!updateStatus) {
    return {
      id: 'pending-update',
      label: 'Pending update',
      value: 'Checking',
      detail: 'Update status has not loaded yet.',
      href: '/admin/updates',
      routeId: 'updates',
      badge: 'Pending',
      badgeStatus: 'neutral',
    }
  }

  if (currentJob && !isSystemUpdateJobTerminal(currentJob)) {
    return {
      id: 'pending-update',
      label: 'Pending update',
      value: formatSystemUpdateStatusLabel(currentJob.status),
      detail: `${currentJob.phase.label}: ${currentJob.checkpoint.label}`,
      href: '/admin/updates',
      routeId: 'updates',
      badge: 'Active',
      badgeStatus: 'info',
    }
  }

  if (currentJob?.status === 'failed' || currentJob?.status === 'rollback_attempted') {
    return {
      id: 'pending-update',
      label: 'Pending update',
      value: 'Last run failed',
      detail: currentJob.failureSummary ?? currentJob.message,
      href: '/admin/updates',
      routeId: 'updates',
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  if (updateStatus.updateAvailable) {
    return {
      id: 'pending-update',
      label: 'Pending update',
      value: updateStatus.latestVersion ?? 'Available',
      detail: `Installed ${updateStatus.currentVersion ?? 'Unknown'}.`,
      href: '/admin/updates',
      routeId: 'updates',
      badge: 'Ready',
      badgeStatus: 'warning',
    }
  }

  return {
    id: 'pending-update',
    label: 'Pending update',
    value: 'None',
    detail: `Installed ${updateStatus.currentVersion ?? 'Unknown'}.`,
    href: '/admin/updates',
    routeId: 'updates',
    badge: 'Current',
    badgeStatus: 'success',
  }
}

function getSyncActionableSignal(
  network: SystemStatusResponse['network'] | null
): ActionableSignal {
  if (!network) {
    return {
      id: 'sync-status',
      label: 'Sync path',
      value: 'Checking',
      detail: 'Network telemetry has not loaded yet.',
      href: '/admin/network',
      routeId: 'network',
      badge: 'Pending',
      badgeStatus: 'neutral',
    }
  }

  if (network.remoteReachable === false) {
    return {
      id: 'sync-status',
      label: 'Sync path',
      value: 'Target unreachable',
      detail: network.remoteTarget
        ? `Cannot reach ${network.remoteTarget}.`
        : 'Remote target is unreachable.',
      href: '/admin/network',
      routeId: 'network',
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  if (network.remoteReachable === true) {
    return {
      id: 'sync-status',
      label: 'Sync path',
      value: 'Reachable',
      detail: network.remoteTarget ? `Target ${network.remoteTarget}.` : 'Remote path verified.',
      href: '/admin/network',
      routeId: 'network',
      badge: 'Ready',
      badgeStatus: 'success',
    }
  }

  if (network.internetReachable === false) {
    return {
      id: 'sync-status',
      label: 'Sync path',
      value: 'Internet offline',
      detail: 'External reachability is unavailable.',
      href: '/admin/network',
      routeId: 'network',
      badge: 'Check',
      badgeStatus: 'warning',
    }
  }

  return {
    id: 'sync-status',
    label: 'Sync path',
    value: 'Unverified',
    detail: 'Remote sync target is not configured or not reported.',
    href: '/admin/network',
    routeId: 'network',
    badge: 'Info',
    badgeStatus: 'neutral',
  }
}

function getActionableSignals(input: {
  systemStatus: SystemStatusResponse | null
  updateStatus: SystemUpdateStatusResponse | null
  openAlertCount: number | null
  badgeTotal: number | null
  badgeUnassigned: number | null
}): readonly ActionableSignal[] {
  const databaseHealthy = input.systemStatus?.database.healthy ?? null
  const badgeStaging = getBadgeStagingTelemetry({
    total: input.badgeTotal,
    unassigned: input.badgeUnassigned,
  })

  return [
    getUpdateActionableSignal(input.updateStatus),
    {
      id: 'open-alerts',
      label: 'Open alerts',
      value: input.openAlertCount === null ? 'Checking' : String(input.openAlertCount),
      detail:
        input.openAlertCount === null
          ? 'Security alert feed has not loaded yet.'
          : input.openAlertCount > 0
            ? 'Unacknowledged security alerts need review.'
            : 'No active security alerts.',
      href: '/admin/logs',
      routeId: 'logs',
      badge:
        input.openAlertCount === null ? 'Pending' : input.openAlertCount > 0 ? 'Review' : 'Clear',
      badgeStatus:
        input.openAlertCount === null
          ? 'neutral'
          : input.openAlertCount > 0
            ? 'warning'
            : 'success',
    },
    getSyncActionableSignal(input.systemStatus?.network ?? null),
    {
      id: 'database-probe',
      label: 'Database probe',
      value: databaseHealthy === null ? 'Checking' : databaseHealthy ? 'Connected' : 'Failed',
      detail: input.systemStatus?.database.address ?? 'Database endpoint is not loaded.',
      href: '/admin/database',
      routeId: 'database',
      badge: databaseHealthy === null ? 'Pending' : databaseHealthy ? 'Ready' : 'Check',
      badgeStatus: databaseHealthy === null ? 'neutral' : databaseHealthy ? 'success' : 'warning',
    },
    {
      id: 'badge-staging',
      label: 'Badge staging',
      value: badgeStaging.value,
      detail: badgeStaging.detail,
      href: '/admin/badges',
      routeId: 'badges',
      badge: badgeStaging.badge,
      badgeStatus: badgeStaging.badgeStatus,
    },
  ]
}

interface AdminSystemSnapshot {
  lastCheckedAt: string | null
  backendApi: AdminTelemetryValue
  database: AdminTelemetryValue
  network: AdminTelemetryValue
  updateState: AdminTelemetryValue
  badgeStaging: AdminTelemetryValue
  backendUptimeLabel: string
  installedVersion: string
  activeRemoteSessions: number | null
  managedBadges: number | null
  lastAdminActivityAt: string | null
}

export function AdminControlCenter() {
  const member = useAuthStore((state) => state.member)
  const session = useAuthStore((state) => state.session)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accountLevel = member?.accountLevel ?? 0
  const canAccessAdmin = accountLevel >= AccountLevel.ADMIN
  const pageLoadedAtRef = useRef<number | null>(null)
  const firstActionRecordedRef = useRef(false)
  const [quickActionState, setQuickActionState] = useState<StoredAdminQuickActions>(() =>
    parseStoredAdminQuickActions(null)
  )

  const systemStatusQuery = useSystemStatus({ enabled: isAuthenticated && canAccessAdmin })
  const updateStatusQuery = useSystemUpdateStatus({
    enabled: isAuthenticated && canAccessAdmin,
    refetchIntervalMs: 30_000,
  })
  const badgeStatsQuery = useBadgeStats({ enabled: isAuthenticated && canAccessAdmin })
  const activityQuery = useAuditActivityFeed(isAuthenticated && canAccessAdmin, 20)
  const securityAlertsQuery = useSecurityAlerts({ enabled: isAuthenticated && canAccessAdmin })

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setQuickActionState(
        parseStoredAdminQuickActions(window.localStorage.getItem(ADMIN_QUICK_ACTION_STORAGE_KEY))
      )
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    pageLoadedAtRef.current = Date.now()
    recordAdminNavigationTelemetry({
      eventType: 'page_view',
      routeId: 'admin-home',
      sourceType: 'admin-home',
    })
  }, [])

  const recentIssues = useMemo(
    () =>
      getAdminRecentIssues({
        systemStatus: systemStatusQuery.data ?? null,
        systemStatusError: systemStatusQuery.isError,
        updateStatus: updateStatusQuery.data ?? null,
        updateStatusError: updateStatusQuery.isError,
      }),
    [
      systemStatusQuery.data,
      systemStatusQuery.isError,
      updateStatusQuery.data,
      updateStatusQuery.isError,
    ]
  )

  const visibleQuickActions = useMemo(
    () =>
      ADMIN_QUICK_ACTIONS.filter(
        (action) =>
          action.featureStatus === 'available' && hasAdminQuickActionAccess(action, accountLevel)
      ),
    [accountLevel]
  )
  const pinnedActions = getAdminQuickActionsByIds(quickActionState.pinned).filter(
    (action) =>
      action.featureStatus === 'available' && hasAdminQuickActionAccess(action, accountLevel)
  )
  const recentActions = getAdminQuickActionsByIds(quickActionState.recent).filter(
    (action) =>
      action.featureStatus === 'available' &&
      hasAdminQuickActionAccess(action, accountLevel) &&
      !pinnedActions.some((pinned) => pinned.id === action.id)
  )
  const displayedQuickActions = composeAdminQuickActionsForDisplay({
    pinned: pinnedActions,
    recent: recentActions,
    fallback: visibleQuickActions,
    limit: 6,
  })

  const adminActivity = useMemo(
    () =>
      activityQuery.data?.entries.filter((entry) =>
        ['admin', 'settings', 'badges', 'access'].includes(entry.area)
      ) ?? [],
    [activityQuery.data?.entries]
  )
  const lastAdminChange = useMemo<LastAdminChange | null>(() => {
    const entry = adminActivity.find(
      (activity) => activity.raw.action !== 'login' && activity.raw.action !== 'logout'
    )

    return entry
      ? {
          timestamp: entry.timestamp,
          title: entry.actionLabel,
          detail: `${entry.actorName} · ${entry.subjectLabel}`,
        }
      : null
  }, [adminActivity])
  const openUpdatesAction = ADMIN_QUICK_ACTIONS.find((action) => action.id === 'open-updates')
  const statusView = getAdminStatusView({
    canAccessAdmin,
    loading: systemStatusQuery.isLoading,
    error: systemStatusQuery.isError,
    issueCount: recentIssues.length,
    topIssue: recentIssues[0] ?? null,
    overallLabel: systemStatusQuery.data?.overall.label ?? null,
  })
  const approvedWifi = getApprovedWifiTelemetry(systemStatusQuery.data?.network ?? null)
  const actionableSignals = getActionableSignals({
    systemStatus: systemStatusQuery.data ?? null,
    updateStatus: updateStatusQuery.data ?? null,
    openAlertCount: securityAlertsQuery.data?.count ?? null,
    badgeTotal: badgeStatsQuery.data?.total ?? null,
    badgeUnassigned: badgeStatsQuery.data?.unassigned ?? null,
  })
  const systemSnapshot: AdminSystemSnapshot = {
    lastCheckedAt: systemStatusQuery.data?.lastCheckedAt ?? null,
    backendApi: getBackendApiTelemetry(systemStatusQuery.data?.backend ?? null),
    database: getDatabaseTelemetry(systemStatusQuery.data?.database ?? null),
    network: getNetworkTelemetry(systemStatusQuery.data?.network ?? null),
    updateState: getUpdateTelemetry(updateStatusQuery.data ?? null),
    badgeStaging: getBadgeStagingTelemetry({
      total: badgeStatsQuery.data?.total ?? null,
      unassigned: badgeStatsQuery.data?.unassigned ?? null,
    }),
    backendUptimeLabel: formatUptime(systemStatusQuery.data?.backend.uptimeSeconds),
    installedVersion: updateStatusQuery.data?.currentVersion ?? 'Unknown',
    activeRemoteSessions: systemStatusQuery.data?.remoteSystems.activeCount ?? null,
    managedBadges: badgeStatsQuery.data?.total ?? null,
    lastAdminActivityAt: lastAdminChange?.timestamp ?? null,
  }
  const operatorContextRows: readonly OperatorContextRow[] = [
    {
      icon: 'workstation',
      label: 'Workstation',
      value: session?.remoteSystemName ?? 'Browser session',
      badge: session?.remoteSystemId ? 'Assigned' : 'Local',
      badgeStatus: session?.remoteSystemId ? 'info' : 'neutral',
    },
    {
      icon: 'role',
      label: 'Role',
      value: getAccountLevelLabel(accountLevel),
      badge: canAccessAdmin ? 'Allowed' : 'Restricted',
      badgeStatus: canAccessAdmin ? 'success' : 'warning',
    },
    {
      icon: 'wifi',
      label: 'Approved Wi-Fi',
      value: approvedWifi.value,
      badge: approvedWifi.badge,
      badgeStatus: approvedWifi.badgeStatus,
    },
    {
      icon: 'session',
      label: 'Session',
      value: isAuthenticated ? 'Authenticated' : 'Signed out',
      badge: isAuthenticated ? 'Active' : 'Off',
      badgeStatus: isAuthenticated ? 'success' : 'warning',
    },
    {
      icon: 'database',
      label: 'Runtime',
      value: systemStatusQuery.data?.backend.environment ?? 'Unknown',
      badge: 'Env',
      badgeStatus: 'neutral',
    },
    {
      icon: 'refresh',
      label: 'Last refresh',
      value: systemSnapshot.lastCheckedAt
        ? formatTimestamp(systemSnapshot.lastCheckedAt)
        : 'Not loaded',
      badge: systemStatusQuery.isFetching ? 'Syncing' : 'Seen',
      badgeStatus: systemStatusQuery.isFetching ? 'info' : 'neutral',
    },
  ]

  const handleActionClick = (action: AdminQuickAction) => {
    const nextState = addRecentAdminQuickAction(quickActionState, action.id)
    setQuickActionState(nextState)
    window.localStorage.setItem(
      ADMIN_QUICK_ACTION_STORAGE_KEY,
      serializeStoredAdminQuickActions(nextState)
    )

    recordAdminNavigationTelemetry({
      eventType: 'quick_action',
      routeId: 'admin-home',
      targetRouteId: getRouteIdForAction(action),
      actionId: action.id,
      sourceType: 'quick-action',
    })

    if (!firstActionRecordedRef.current) {
      firstActionRecordedRef.current = true
      recordAdminNavigationTelemetry({
        eventType: 'first_action',
        routeId: 'admin-home',
        targetRouteId: getRouteIdForAction(action),
        actionId: action.id,
        sourceType: 'quick-action',
        elapsedMs:
          pageLoadedAtRef.current === null ? undefined : Date.now() - pageLoadedAtRef.current,
      })
    }
  }

  const handlePinAction = (actionId: AdminQuickActionId) => {
    setQuickActionState((current) => {
      const pinned = current.pinned.includes(actionId)
        ? current.pinned.filter((item) => item !== actionId)
        : [actionId, ...current.pinned]
      const nextState = {
        ...current,
        pinned,
      }
      window.localStorage.setItem(
        ADMIN_QUICK_ACTION_STORAGE_KEY,
        serializeStoredAdminQuickActions(nextState)
      )
      return nextState
    })
  }

  return (
    <div className="space-y-(--space-6)">
      <section
        className={cn(
          'rounded-box border border-l-4 bg-base-100 px-(--space-5) py-(--space-4) shadow-[var(--shadow-2)]',
          statusView.surfaceClass
        )}
        aria-live="polite"
      >
        <div className="grid items-center gap-(--space-4) xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-start gap-(--space-4)">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-box bg-base-100 shadow-[var(--shadow-1)] ring-1 ring-base-content/10">
              {statusView.icon === 'healthy' ? (
                <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
              ) : statusView.icon === 'loading' ? (
                <Clock3 className="h-7 w-7 text-info" aria-hidden="true" />
              ) : (
                <AlertTriangle
                  className={cn(
                    'h-7 w-7',
                    statusView.tone === 'error' ? 'text-error' : 'text-warning'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-(--space-2)">
                <h1 id="admin-page-title" className="font-display text-4xl font-bold leading-tight">
                  {statusView.headline}
                </h1>
                <AppBadge status={statusView.badgeStatus} size="lg">
                  {statusView.badge}
                </AppBadge>
              </div>
              <p className="mt-(--space-1) max-w-3xl text-sm font-medium leading-relaxed text-base-content/78">
                {statusView.message}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-(--space-1) rounded-box border border-base-300/80 bg-base-200/65 p-(--space-1) shadow-[var(--shadow-1)]">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                void systemStatusQuery.refetch()
                void updateStatusQuery.refetch()
                void badgeStatsQuery.refetch()
                void activityQuery.refetch()
                void securityAlertsQuery.refetch()
              }}
              disabled={
                systemStatusQuery.isFetching ||
                updateStatusQuery.isFetching ||
                badgeStatsQuery.isFetching ||
                activityQuery.isFetching ||
                securityAlertsQuery.isFetching
              }
            >
              <RefreshCw
                className={cn(
                  'mr-2 h-4 w-4',
                  (systemStatusQuery.isFetching ||
                    updateStatusQuery.isFetching ||
                    badgeStatsQuery.isFetching ||
                    activityQuery.isFetching ||
                    securityAlertsQuery.isFetching) &&
                    'animate-spin'
                )}
              />
              Refresh
            </button>
            <Link
              href="/admin/updates"
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (openUpdatesAction) {
                  handleActionClick(openUpdatesAction)
                }
              }}
            >
              Open updates
            </Link>
          </div>
        </div>
      </section>

      {!canAccessAdmin && (
        <AppAlert tone="warning" heading="Admin access required">
          Sign in with an Admin or Developer account to use the Admin Control Center.
        </AppAlert>
      )}

      <section className="grid min-w-0 gap-(--space-5) xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.65fr)]">
        <div className="space-y-(--space-4)">
          <RecentIssuesPanel issues={recentIssues} loading={systemStatusQuery.isLoading} />
          <QuickActionsPanel
            actions={displayedQuickActions}
            pinnedIds={quickActionState.pinned}
            onActionClick={handleActionClick}
            onPinAction={handlePinAction}
          />
          <ActionableSignalsPanel
            loading={
              systemStatusQuery.isLoading ||
              updateStatusQuery.isLoading ||
              badgeStatsQuery.isLoading ||
              securityAlertsQuery.isLoading
            }
            signals={actionableSignals}
          />
          <SystemSnapshotPanel snapshot={systemSnapshot} />
        </div>

        <aside className="self-start space-y-(--space-4)">
          <OperatorContextPanel rows={operatorContextRows} />
          <LastAdminChangeLine
            loading={activityQuery.isLoading}
            error={activityQuery.isError}
            change={lastAdminChange}
          />
        </aside>
      </section>
    </div>
  )
}

function RecentIssuesPanel({
  issues,
  loading,
}: {
  issues: readonly AdminIssue[]
  loading: boolean
}) {
  const panelStatus = loading
    ? 'info'
    : issues.some((issue) => issue.tone === 'error')
      ? 'error'
      : issues.length > 0
        ? 'warning'
        : 'success'

  if (!loading && issues.length === 0) {
    return (
      <AppCard className="bg-base-100 shadow-[var(--shadow-1)]" status="success">
        <AppCardContent className="px-(--space-5) py-(--space-3)">
          <div className="flex items-center justify-between gap-(--space-3)">
            <div className="flex min-w-0 items-center gap-(--space-3)">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-tight text-base-content">
                  No active issues
                </h2>
                <p className="mt-0.5 truncate text-sm font-medium text-base-content/72">
                  Issue queue expands when an actionable warning or blocker appears.
                </p>
              </div>
            </div>
            <AppBadge status="success" size="sm">
              Clear
            </AppBadge>
          </div>
        </AppCardContent>
      </AppCard>
    )
  }

  return (
    <AppCard className="bg-base-100 shadow-[var(--shadow-2)]" status={panelStatus}>
      <AppCardHeader className="px-(--space-5) pt-(--space-4)">
        <div className="flex items-center justify-between gap-(--space-3)">
          <div>
            <AppCardTitle className="text-xl">Issues requiring action</AppCardTitle>
            <AppCardDescription className="text-base-content/68">
              Blockers and degraded states with direct recovery paths.
            </AppCardDescription>
          </div>
          <AppBadge status={panelStatus} size="md" pulse={panelStatus !== 'success'}>
            {loading ? 'Checking' : issues.length > 0 ? `${issues.length} active` : 'No issues'}
          </AppBadge>
        </div>
      </AppCardHeader>
      <AppCardContent className="space-y-(--space-2) px-(--space-5) py-(--space-3)">
        {loading ? (
          <LoadingSkeleton variant="card" count={2} className="h-20" />
        ) : (
          issues.slice(0, 5).map((issue) => (
            <Link
              key={issue.id}
              href={issue.href}
              className={cn(
                'group flex items-start justify-between gap-(--space-4) rounded-box border border-l-4 p-(--space-3) shadow-[var(--shadow-1)] transition-[box-shadow,transform] duration-(--duration-fast) hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] focus:outline-none focus:ring-2 focus:ring-primary/35',
                issueToneSurfaceClasses[issue.tone]
              )}
              onClick={() => {
                recordAdminNavigationTelemetry({
                  eventType: 'nav_click',
                  routeId: 'admin-home',
                  targetRouteId: issue.routeId,
                  sourceType: 'recent-issue',
                })
              }}
            >
              <div className="flex min-w-0 items-start gap-(--space-3)">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold leading-tight text-current">{issue.title}</p>
                  <p className="mt-(--space-1) line-clamp-2 text-sm leading-relaxed text-current opacity-80">
                    {issue.detail}
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-(--space-2)">
                <AppBadge status={issueToneBadgeStatus[issue.tone]} size="sm">
                  {issue.tone === 'error' ? 'Blocker' : 'Warning'}
                </AppBadge>
                <span className="text-xs font-semibold text-current opacity-75 group-hover:opacity-100">
                  Open
                </span>
              </span>
            </Link>
          ))
        )}
      </AppCardContent>
    </AppCard>
  )
}

function QuickActionsPanel({
  actions,
  pinnedIds,
  onActionClick,
  onPinAction,
}: {
  actions: readonly AdminQuickAction[]
  pinnedIds: readonly AdminQuickActionId[]
  onActionClick: (action: AdminQuickAction) => void
  onPinAction: (actionId: AdminQuickActionId) => void
}) {
  return (
    <AppCard className="bg-base-100 shadow-[var(--shadow-2)]">
      <AppCardHeader>
        <AppCardTitle>Quick actions</AppCardTitle>
        <AppCardDescription className="text-base-content/68">
          Pinned and recent tools for common operator work.
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent>
        <div className="grid gap-(--space-3) xl:grid-cols-3">
          {actions.map((action) => {
            const pinned = pinnedIds.includes(action.id)

            return (
              <div
                key={action.id}
                className="group relative min-h-32 cursor-pointer rounded-box border border-base-300/80 bg-base-100 shadow-[var(--shadow-1)] transition-[box-shadow,transform] duration-(--duration-fast) hover:-translate-y-px hover:bg-base-100 hover:shadow-[var(--shadow-2)] active:translate-y-0 active:shadow-[var(--shadow-1)]"
              >
                <Link
                  href={action.href}
                  className="block h-full cursor-pointer p-(--space-4) pr-(--space-10) focus:outline-none focus:ring-2 focus:ring-primary/35"
                  onClick={() => onActionClick(action)}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-box bg-base-200 text-base-content/68 shadow-[var(--shadow-1)] transition-colors duration-(--duration-fast) group-hover:bg-primary-fadded group-hover:text-primary-fadded-content">
                    <AdminIcon icon={action.icon} className="h-5 w-5" />
                  </div>
                  <div className="mt-(--space-3) min-w-0">
                    <p className="text-base font-extrabold leading-tight text-base-content/90 transition-colors duration-(--duration-fast) group-hover:text-base-content">
                      {action.label}
                    </p>
                    <p className="mt-(--space-1) line-clamp-2 text-sm leading-relaxed text-base-content/72">
                      {action.description}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="absolute bottom-(--space-3) right-(--space-3) h-4 w-4 text-primary opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square absolute right-(--space-2) top-(--space-2) opacity-65 hover:opacity-100"
                  aria-label={pinned ? `Unpin ${action.label}` : `Pin ${action.label}`}
                  onClick={() => onPinAction(action.id)}
                >
                  {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
              </div>
            )
          })}
        </div>
      </AppCardContent>
    </AppCard>
  )
}

function ActionableSignalsPanel({
  loading,
  signals,
}: {
  loading: boolean
  signals: readonly ActionableSignal[]
}) {
  return (
    <AppCard className="bg-base-100 shadow-[var(--shadow-2)]">
      <AppCardHeader>
        <div className="flex items-center justify-between gap-(--space-3)">
          <div>
            <AppCardTitle>Actionable signals</AppCardTitle>
            <AppCardDescription className="text-base-content/68">
              Operational conditions that can change what an admin does next.
            </AppCardDescription>
          </div>
          <AppBadge
            status={signals.some((signal) => signal.badgeStatus === 'warning') ? 'warning' : 'info'}
            size="sm"
          >
            {signals.some((signal) => signal.badgeStatus === 'warning') ? 'Review' : 'Live'}
          </AppBadge>
        </div>
      </AppCardHeader>
      <AppCardContent>
        {loading ? (
          <LoadingSkeleton variant="card" count={3} className="h-24" />
        ) : (
          <div className="grid gap-(--space-3) xl:grid-cols-5">
            {signals.map((signal) => (
              <Link
                key={signal.id}
                href={signal.href}
                className="group min-h-32 rounded-box border border-base-300/80 bg-base-100 p-(--space-4) shadow-[var(--shadow-1)] transition-[box-shadow,transform] duration-(--duration-fast) hover:-translate-y-px hover:shadow-[var(--shadow-2)] focus:outline-none focus:ring-2 focus:ring-primary/35"
                onClick={() => {
                  recordAdminNavigationTelemetry({
                    eventType: 'nav_click',
                    routeId: 'admin-home',
                    targetRouteId: signal.routeId,
                    sourceType: 'admin-home',
                  })
                }}
              >
                <div className="flex items-start justify-between gap-(--space-2)">
                  <p className="line-clamp-1 text-[0.68rem] font-bold uppercase tracking-wide text-base-content/62">
                    {signal.label}
                  </p>
                  <AppBadge status={signal.badgeStatus} size="sm">
                    {signal.badge}
                  </AppBadge>
                </div>
                <p className="mt-(--space-3) break-words text-lg font-extrabold leading-tight text-base-content">
                  {signal.value}
                </p>
                <p className="mt-(--space-2) line-clamp-2 text-sm font-medium leading-snug text-base-content/72">
                  {signal.detail}
                </p>
                <span className="mt-(--space-3) inline-flex items-center gap-(--space-1) text-xs font-bold text-primary opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100">
                  Open
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </AppCardContent>
    </AppCard>
  )
}

function OperatorContextPanel({ rows }: { rows: readonly OperatorContextRow[] }) {
  return (
    <AppCard className="bg-base-100 shadow-[var(--shadow-2)]">
      <AppCardHeader>
        <AppCardTitle>Operator context</AppCardTitle>
        <AppCardDescription className="text-base-content/68">
          Current workstation, role, and session environment.
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent className="space-y-(--space-2)">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-box bg-base-200/65 px-(--space-3) py-(--space-2) shadow-[var(--shadow-1)]"
          >
            <div className="flex items-start gap-(--space-2)">
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-box bg-base-100 text-base-content/68">
                <OperatorContextIcon icon={row.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-(--space-2)">
                  <p className="truncate text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/62">
                    {row.label}
                  </p>
                  <AppBadge status={row.badgeStatus} size="sm">
                    {row.badge}
                  </AppBadge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-base-content">
                  {row.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </AppCardContent>
    </AppCard>
  )
}

function LastAdminChangeLine({
  loading,
  error,
  change,
}: {
  loading: boolean
  error: boolean
  change: LastAdminChange | null
}) {
  return (
    <div className="rounded-box bg-base-200/65 px-(--space-3) py-(--space-3) shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between gap-(--space-3)">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-base-content/62">
            Last admin change
          </p>
          {loading ? (
            <LoadingSkeleton className="mt-(--space-2) h-4 w-48" />
          ) : error ? (
            <p className="mt-0.5 text-sm font-bold text-warning">Logs unavailable</p>
          ) : change ? (
            <>
              <p className="mt-0.5 truncate text-sm font-bold leading-snug text-base-content">
                {change.title}
              </p>
              <p className="truncate text-xs font-medium text-base-content/72">
                {change.detail} · {formatTimestamp(change.timestamp)}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm font-bold text-base-content">No admin changes loaded</p>
          )}
        </div>
        <Link
          href="/admin/logs"
          className="btn btn-ghost btn-xs shrink-0"
          onClick={() => {
            recordAdminNavigationTelemetry({
              eventType: 'nav_click',
              routeId: 'admin-home',
              targetRouteId: 'logs',
              sourceType: 'admin-home',
            })
          }}
        >
          Logs
        </Link>
      </div>
    </div>
  )
}

function SystemSnapshotPanel({ snapshot }: { snapshot: AdminSystemSnapshot }) {
  const snapshotRows: readonly SnapshotTelemetryRow[] = [
    {
      label: 'Backend API',
      value: snapshot.backendApi.value,
      detail: snapshot.backendApi.detail,
      badge: snapshot.backendApi.badge,
      badgeStatus: snapshot.backendApi.badgeStatus,
    },
    {
      label: 'Installed version',
      value: snapshot.installedVersion,
      detail: 'Sentinel package/runtime version.',
      badge: 'Version',
      badgeStatus: 'neutral',
    },
    {
      label: 'API uptime',
      value: snapshot.backendUptimeLabel,
      detail: 'Backend process runtime since service start.',
      badge: 'Runtime',
      badgeStatus: 'neutral',
    },
    {
      label: 'Database',
      value: snapshot.database.value,
      detail: snapshot.database.detail,
      badge: snapshot.database.badge,
      badgeStatus: snapshot.database.badgeStatus,
    },
    {
      label: 'Network state',
      value: snapshot.network.value,
      detail: snapshot.network.detail,
      badge: snapshot.network.badge,
      badgeStatus: snapshot.network.badgeStatus,
    },
    {
      label: 'Remote sessions',
      value:
        snapshot.activeRemoteSessions === null
          ? 'Unknown'
          : `${snapshot.activeRemoteSessions} active`,
      detail: 'Remote-system browser sessions.',
      badge: snapshot.activeRemoteSessions === null ? 'Unknown' : 'Live',
      badgeStatus: snapshot.activeRemoteSessions === null ? 'neutral' : 'info',
    },
    {
      label: 'Badge staging',
      value: snapshot.badgeStaging.value,
      detail: snapshot.badgeStaging.detail,
      badge: snapshot.badgeStaging.badge,
      badgeStatus: snapshot.badgeStaging.badgeStatus,
    },
    {
      label: 'Update state',
      value: snapshot.updateState.value,
      detail: snapshot.updateState.detail,
      badge: snapshot.updateState.badge,
      badgeStatus: snapshot.updateState.badgeStatus,
    },
    {
      label: 'Last check',
      value: snapshot.lastCheckedAt ? formatTimestamp(snapshot.lastCheckedAt) : 'Not available',
      detail: 'System-status polling timestamp.',
      badge: snapshot.lastCheckedAt ? 'Seen' : 'Unknown',
      badgeStatus: snapshot.lastCheckedAt ? 'neutral' : 'warning',
    },
    {
      label: 'Admin activity',
      value: snapshot.lastAdminActivityAt
        ? formatTimestamp(snapshot.lastAdminActivityAt)
        : 'None loaded',
      detail: 'Most recent grouped admin activity.',
      badge: snapshot.lastAdminActivityAt ? 'Recent' : 'Empty',
      badgeStatus: snapshot.lastAdminActivityAt ? 'neutral' : 'neutral',
    },
  ]

  return (
    <AppCard className="bg-base-100 shadow-[var(--shadow-2)]">
      <AppCardHeader>
        <AppCardTitle>System snapshot</AppCardTitle>
        <AppCardDescription className="text-base-content/68">
          Concise telemetry for the current appliance state.
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent className="grid gap-(--space-2) xl:grid-cols-2">
        {snapshotRows.map((row) => (
          <div
            key={row.label}
            className="rounded-box bg-base-200/65 p-(--space-3) shadow-[var(--shadow-1)]"
          >
            <div className="flex items-start justify-between gap-(--space-2)">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/62">
                {row.label}
              </p>
              <AppBadge status={row.badgeStatus} size="sm">
                {row.badge}
              </AppBadge>
            </div>
            <p className="mt-(--space-1) line-clamp-1 text-sm font-bold leading-snug text-base-content">
              {row.value}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-medium leading-snug text-base-content/72">
              {row.detail}
            </p>
          </div>
        ))}
      </AppCardContent>
    </AppCard>
  )
}

function getRouteIdForAction(action: AdminQuickAction): AdminRouteId {
  if (action.href.startsWith('/admin/updates')) return 'updates'
  if (action.href.startsWith('/admin/network')) return 'network'
  if (action.href.startsWith('/admin/logs')) return 'logs'
  if (action.href.startsWith('/admin/database')) return 'database'
  if (action.href.startsWith('/admin/badges')) return 'badges'
  if (action.href.startsWith('/admin/config')) return 'config'

  return 'admin-home'
}

function getAdminStatusView(input: {
  canAccessAdmin: boolean
  loading: boolean
  error: boolean
  issueCount: number
  topIssue: AdminIssue | null
  overallLabel: string | null
}) {
  if (!input.canAccessAdmin) {
    return {
      tone: 'warning' as const,
      icon: 'warning' as const,
      headline: 'Admin access required',
      badge: 'Restricted',
      badgeStatus: 'warning' as AppBadgeStatus,
      surfaceClass: 'border-warning/45 border-l-warning bg-warning-fadded',
      message: 'Admin or Developer access is required for system-control operations.',
    }
  }

  if (input.loading) {
    return {
      tone: 'info' as const,
      icon: 'loading' as const,
      headline: 'Checking system state',
      badge: 'Loading',
      badgeStatus: 'info' as AppBadgeStatus,
      surfaceClass: 'border-info/40 border-l-info bg-info-fadded',
      message: 'Loading Sentinel appliance status.',
    }
  }

  if (input.error) {
    return {
      tone: 'error' as const,
      icon: 'warning' as const,
      headline: 'System status unavailable',
      badge: 'Attention',
      badgeStatus: 'error' as AppBadgeStatus,
      surfaceClass: 'border-error/45 border-l-error bg-error-fadded',
      message: 'Sentinel could not load system health. Open diagnostics before making changes.',
    }
  }

  if (input.issueCount > 0) {
    const headline =
      input.topIssue?.tone === 'error'
        ? getCriticalIssueHeadline(input.topIssue)
        : input.issueCount === 1
          ? '1 issue needs attention'
          : `${input.issueCount} issues need attention`

    return {
      tone: 'warning' as const,
      icon: 'warning' as const,
      headline,
      badge: `${input.issueCount} active`,
      badgeStatus: 'warning' as AppBadgeStatus,
      surfaceClass: 'border-warning/45 border-l-warning bg-warning-fadded',
      message: input.topIssue
        ? `Start with ${input.topIssue.title.toLowerCase()} in Recent issues.`
        : 'Start with Recent issues before making routine changes.',
    }
  }

  return {
    tone: 'success' as const,
    icon: 'healthy' as const,
    headline: 'All systems healthy',
    badge: input.overallLabel ?? 'Healthy',
    badgeStatus: 'success' as AppBadgeStatus,
    surfaceClass: 'border-base-300 border-l-success bg-base-100',
    message: 'Sentinel is ready for controlled administration.',
  }
}

function getCriticalIssueHeadline(issue: AdminIssue): string {
  if (issue.routeId === 'database') return 'Database needs attention'
  if (issue.routeId === 'network') return 'Network needs attention'
  if (issue.routeId === 'logs') return 'System diagnostics needed'
  if (issue.routeId === 'updates') return 'Update needs attention'

  return issue.title
}
