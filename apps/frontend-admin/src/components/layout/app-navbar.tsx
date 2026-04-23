'use client'
/* global process */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  SystemHealthStatus,
  SystemUpdateJob,
  SystemStatusResponse,
  SystemUpdateJobStatus,
} from '@sentinel/contracts'
import { Menu, PanelLeftOpen } from 'lucide-react'
import { toast } from 'sonner'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import { ADMIN_NAV_ROUTES, isAdminNavPath } from '@/lib/admin-routes'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'
import { HelpButton } from '@/components/help/HelpButton'
import { useHostHotspotRecovery } from '@/hooks/use-network-settings'
import { useSystemStatus } from '@/hooks/use-system-status'
import { useSystemUpdateStatus } from '@/hooks/use-system-update'
import { TID } from '@/lib/test-ids'
import { AccountLevel, useAuthStore } from '@/store/auth-store'
import { getWirelessRecoveryState } from './app-navbar.logic'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/checkins', label: 'History' },
  { href: '/members', label: 'Members' },
  { href: '/events', label: 'Events' },
  { href: '/schedules', label: 'Schedules' },
]

interface AppNavbarProps {
  drawerId: string
  isDrawerOpen: boolean
}

const WIKI_LAN_FALLBACK_PORT = '3020'
const WIKI_LOCAL_DEV_PORT = '3002'
const DEPLOYMENT_REMOTE_SYSTEM_CODE = 'deployment_laptop'

export function AppNavbar({ drawerId, isDrawerOpen }: AppNavbarProps) {
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const member = useAuthStore((state) => state.member)
  const authSession = useAuthStore((state) => state.session)
  const queryClient = useQueryClient()
  const hostHotspotRecovery = useHostHotspotRecovery()
  const systemStatusQuery = useSystemStatus({ enabled: isAuthenticated })
  const systemUpdateQuery = useSystemUpdateStatus({
    enabled: isAuthenticated,
    refetchIntervalMs: 30_000,
  })
  const systemStatus = systemStatusQuery.data ?? null
  const systemUpdateStatus = systemUpdateQuery.data ?? null
  const isStatusLoading = !isAuthenticated || systemStatusQuery.isLoading
  const { dot, label, badgeStatus } = getSystemSummaryBadge({
    systemStatus,
    isLoading: isStatusLoading,
    isError: systemStatusQuery.isError,
  })
  const isAdminRoute = isAdminNavPath(pathname)
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const browserOrigin =
    isClient && typeof window !== 'undefined'
      ? window.location.origin || 'current browser host'
      : 'current browser host'
  const frontendStatus: AppBadgeStatus = 'success'
  const frontendValue = 'Loaded'
  const backendLocation = resolveBackendLocation(browserOrigin)
  const backendStatus = getBackendStatus(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const backendValue = getBackendValue(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const backendTooltip = getBackendTooltip(
    systemStatus,
    isStatusLoading,
    systemStatusQuery.isError,
    backendLocation
  )
  const databaseStatus = getDatabaseStatus(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const databaseValue = getDatabaseValue(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const databaseLocation = systemStatus?.database.address ?? 'unknown'
  const databaseTooltip = getDatabaseTooltip(
    systemStatus,
    isStatusLoading,
    systemStatusQuery.isError,
    databaseLocation
  )
  const networkStatus = getHealthBadgeStatus(
    systemStatus?.network.status ?? 'unknown',
    isStatusLoading,
    systemStatusQuery.isError
  )
  const networkValue = getNetworkValue(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const networkMessage = getNetworkMessage(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const environment = (systemStatus?.backend.environment ?? 'unknown').toLowerCase()
  const isDevelopmentEnvironment = environment !== 'production'
  const networkTooltip = getNetworkTooltip(
    systemStatus,
    isStatusLoading,
    systemStatusQuery.isError,
    isDevelopmentEnvironment
  )
  const networkSubtitle =
    systemStatus?.network.currentSsid ??
    (isDevelopmentEnvironment ? 'Local development host' : 'Host telemetry')
  const wikiBaseUrl = resolveWikiBaseUrl(
    process.env.NEXT_PUBLIC_WIKI_BASE_URL?.trim() ?? '',
    browserOrigin
  )
  const wikiLocation = stripUrlProtocol(wikiBaseUrl)
  const wikiStatus = getWikiStatus(wikiBaseUrl)
  const wikiValue = getWikiValue(wikiBaseUrl)
  const wikiTooltip = getWikiTooltip(wikiBaseUrl, wikiLocation)
  const frontendTooltip = getFrontendTooltip(browserOrigin)
  const activeRemoteSessions = systemStatus?.remoteSystems.sessions ?? []
  const remoteSystemOverflowCount = systemStatus?.remoteSystems.overflowCount ?? 0
  const hasAdminAccess = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const wirelessRecovery = getWirelessRecoveryState({
    systemStatus,
    isLoading: isStatusLoading,
    isError: systemStatusQuery.isError,
    hasAdminAccess,
  })
  const currentVersion =
    systemUpdateStatus?.currentVersion ??
    normalizeVersionTag(systemStatus?.backend.version ?? null) ??
    'unknown'
  const latestVersion = systemUpdateStatus?.latestVersion ?? null
  const versionStatusLabel = getVersionStatus(currentVersion, latestVersion)
  const updateAvailable = systemUpdateStatus?.updateAvailable ?? false
  const currentSystemUpdateJob = systemUpdateStatus?.currentJob ?? null
  const hasActiveSystemUpdate =
    currentSystemUpdateJob !== null && !isSystemUpdateJobTerminal(currentSystemUpdateJob)

  const handleHostHotspotRecovery = async () => {
    try {
      const result = await hostHotspotRecovery.mutateAsync()
      toast.success(result.message)
      ;[2_000, 5_000, 10_000, 20_000].forEach((delayMs) => {
        window.setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['system-status'] })
        }, delayMs)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue host hotspot recovery')
    }
  }

  return (
    <div className="navbar w-full shadow-lg bg-primary text-primary-content">
      <div className="navbar-start">
        {/* Sidebar Toggle - only visible when drawer is closed */}
        {!isDrawerOpen && (
          <label htmlFor={drawerId} aria-label="open sidebar" className="btn btn-square btn-ghost">
            <Menu className="h-6 w-6 lg:hidden" />
            <PanelLeftOpen className="hidden h-5 w-5 lg:block" />
          </label>
        )}

        {/* Logo with backend status indicator */}
        <div className="max-w-48 truncate sm:max-w-none" data-testid={TID.nav.logo}>
          <div className="flex items-center gap-(--space-2) px-2 sm:px-4">
            <span className="text-lg font-bold sm:text-2xl">HMCS Chippawa</span>
            {authSession?.remoteSystemName && (
              <Chip
                variant="light"
                color="secondary"
                size="lg"
                className="max-w-32 truncate"
                data-testid={TID.nav.remoteSystemBadge}
                title={authSession.remoteSystemName}
              >
                {authSession.remoteSystemName}
              </Chip>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links - hidden on mobile, visible on desktop */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu text-lg menu-horizontal px-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(pathname === link.href && 'active')}
                data-testid={TID.nav.link(link.href.slice(1))}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={wikiBaseUrl}
              target="_blank"
              rel="noreferrer"
              data-testid={TID.nav.link('wiki')}
            >
              Wiki
            </a>
          </li>
          <li>
            <div className="dropdown dropdown-hover">
              <button
                type="button"
                tabIndex={0}
                className={cn('inline-flex items-center gap-1', isAdminRoute && 'active')}
                data-testid={TID.nav.link('admin')}
              >
                Admin
              </button>
              <ul
                tabIndex={-1}
                className="dropdown-content z-20 w-56 rounded-box bg-base-100 p-2 text-base-content shadow-xl"
              >
                {ADMIN_NAV_ROUTES.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(pathname === link.href && 'active')}
                      data-testid={TID.nav.link(link.href.slice(1))}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        </ul>
      </div>

      <div className="navbar-end gap-1.5 sm:gap-2">
        <HelpButton />
        <div className="dropdown dropdown-end dropdown-hover">
          <div tabIndex={0} role="button" data-testid={TID.nav.backendStatus}>
            <AppBadge status={badgeStatus} size="md" className="badge-outline backend-status-badge">
              <span className={cn('status', dot)} />
              <span className="hidden sm:inline">{label}</span>
            </AppBadge>
          </div>
          <div
            tabIndex={0}
            className="dropdown-content card card-sm mt-0 w-72 border border-base-300 bg-base-100 text-base-content shadow-xl z-(--z-popover)"
            data-testid={TID.nav.backendStatusDetails}
          >
            <div className="card-body gap-2 p-(--space-3)">
              <p className="text-xs font-semibold uppercase tracking-wide">System Status</p>
              <StatusRow
                label="Database"
                subtitle={databaseLocation}
                status={databaseStatus}
                value={databaseValue}
                tooltip={databaseTooltip}
              />
              <StatusRow
                label="Backend API"
                subtitle={backendLocation}
                status={backendStatus}
                value={backendValue}
                tooltip={backendTooltip}
              />
              <StatusRow
                label="Frontend"
                subtitle={stripUrlProtocol(browserOrigin)}
                status={frontendStatus}
                value={frontendValue}
                tooltip={frontendTooltip}
              />
              <StatusRow
                label="Wiki"
                subtitle={wikiLocation}
                status={wikiStatus}
                value={wikiValue}
                tooltip={wikiTooltip}
              />
              <StatusRow
                label="Network"
                subtitle={networkSubtitle}
                status={networkStatus}
                value={networkValue}
                tooltip={networkTooltip}
              />
              <div
                className={cn(
                  'rounded-box border px-(--space-3) py-(--space-2)',
                  networkStatus === 'error'
                    ? 'border-error/25 bg-error-fadded text-error-fadded-content'
                    : networkStatus === 'warning'
                      ? 'border-warning/35 bg-warning-fadded text-warning-fadded-content'
                      : 'border-base-300 bg-base-200 text-base-content'
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">Network Detail</p>
                <p className="mt-1 text-xs leading-relaxed">{networkMessage}</p>
                <dl className="mt-2 space-y-1 text-[11px] text-current/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt>Issue</dt>
                    <dd className="font-mono text-right">
                      {formatNetworkIssueLabel(systemStatus?.network.issueCode ?? null)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Host IP</dt>
                    <dd className="font-mono text-right">
                      {systemStatus?.network.hostIpAddress ?? 'Unavailable'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Approved SSID</dt>
                    <dd className="font-mono text-right">
                      {systemStatus?.network.approvedSsids[0] ?? 'Not configured'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>AP profile</dt>
                    <dd className="font-mono text-right">
                      {formatHotspotProfilePresence(systemStatus)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>AP adapter</dt>
                    <dd className="font-mono text-right">{formatHotspotAdapter(systemStatus)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Scan radio</dt>
                    <dd className="font-mono text-right">{formatScanRadio(systemStatus)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>AP visibility</dt>
                    <dd className="font-mono text-right">
                      {formatHotspotVisibility(systemStatus)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div
                className="border-t border-base-300 pt-2"
                data-testid={TID.nav.backendStatusRemoteSystems}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">Remote Systems</p>
                {isDevelopmentEnvironment && (
                  <p className="mt-1 text-[11px] text-base-content/60">
                    Development mode: remote-system names are not enforced.
                  </p>
                )}
                {activeRemoteSessions.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {activeRemoteSessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className="flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm leading-tight">{session.remoteSystemName}</p>
                          <p className="text-[11px] text-base-content/60">
                            {session.memberRank} {session.memberName}
                          </p>
                          <p className="font-mono text-[11px] text-base-content/60">
                            {resolveRemoteSystemIpAddress(session, systemStatus)}
                          </p>
                        </div>
                        <AppBadge status="success" size="sm">
                          {formatRecentTimestamp(session.lastSeenAt)}
                        </AppBadge>
                      </div>
                    ))}
                    {remoteSystemOverflowCount > 0 && (
                      <p className="text-[11px] text-base-content/60">
                        +{remoteSystemOverflowCount} more active
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-base-content/60">
                    {isStatusLoading
                      ? 'Checking active remote systems...'
                      : 'No remote systems currently active.'}
                  </p>
                )}
              </div>
              {wirelessRecovery.showSection && (
                <div
                  className={cn(
                    'mt-1 rounded-box border p-(--space-2)',
                    networkStatus === 'error'
                      ? 'border-warning/35 bg-warning-fadded text-warning-fadded-content'
                      : 'border-base-300 bg-base-200 text-base-content'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">Wireless Recovery</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {getWirelessRecoveryCopy(
                      systemStatus,
                      isStatusLoading,
                      systemStatusQuery.isError,
                      wirelessRecovery.primaryApprovedSsid
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-(--space-2)">
                    {wirelessRecovery.connectLaptopHref ? (
                      <a
                        href={wirelessRecovery.connectLaptopHref}
                        className={cn(
                          'btn btn-xs',
                          networkStatus === 'error' ? 'btn-warning' : 'btn-outline'
                        )}
                        data-testid={TID.nav.backendStatusRecovery}
                      >
                        Connect this laptop
                      </a>
                    ) : wirelessRecovery.showConnectLaptop ? (
                      <span className="text-[11px] text-base-content/70">
                        No approved hotspot SSID is configured yet.
                      </span>
                    ) : null}
                    {wirelessRecovery.showRepairHostHotspot && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        onClick={() => void handleHostHotspotRecovery()}
                        disabled={hostHotspotRecovery.isPending}
                        data-testid={TID.nav.backendStatusHostRecovery}
                      >
                        {hostHotspotRecovery.isPending ? 'Queueing...' : 'Repair host hotspot'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-1 border-t border-base-300 pt-2 text-xs text-base-content/75">
                <p>
                  Version: <span className="font-mono text-base-content">{currentVersion}</span>
                  {versionStatusLabel !== 'unknown' && (
                    <span className="text-base-content/75"> ({versionStatusLabel})</span>
                  )}
                </p>
                <div
                  className="mt-2 rounded-box border border-base-300 bg-base-200 p-(--space-2)"
                  data-testid={TID.nav.backendStatusSystemUpdate}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">Updates</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {hasActiveSystemUpdate && currentSystemUpdateJob
                      ? `Update ${currentSystemUpdateJob.targetVersion} is ${formatSystemUpdateStatus(currentSystemUpdateJob.status).toLowerCase()}.`
                      : updateAvailable && latestVersion
                        ? `${latestVersion} is available for this appliance.`
                        : 'Sentinel is on the latest known stable release.'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-(--space-2)">
                    <Link href="/settings?tab=updates" className="btn btn-xs btn-outline">
                      Open updates
                    </Link>
                    {hasActiveSystemUpdate && currentSystemUpdateJob && (
                      <AppBadge status="warning" size="sm">
                        {formatSystemUpdateStatus(currentSystemUpdateJob.status)}
                      </AppBadge>
                    )}
                  </div>
                </div>
                <p>
                  Environment:{' '}
                  <span className="font-mono text-base-content">
                    {systemStatus?.backend.environment ?? 'unknown'}
                  </span>
                </p>
                <p>
                  Uptime:{' '}
                  <span className="font-mono text-base-content">
                    {formatUptime(systemStatus?.backend.uptimeSeconds)}
                  </span>
                </p>
                <p>
                  Last Check:{' '}
                  <span className="font-mono text-base-content">
                    {formatTimestamp(systemStatus?.lastCheckedAt ?? null)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <UserMenu />
      </div>
    </div>
  )
}

function formatUptime(uptimeSeconds: number | undefined): string {
  if (uptimeSeconds === undefined) {
    return 'unknown'
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

function formatNetworkIssueLabel(
  issueCode: SystemStatusResponse['network']['issueCode'] | null
): string {
  switch (issueCode) {
    case 'telemetry_unavailable':
      return 'Telemetry unavailable'
    case 'telemetry_stale':
      return 'Telemetry stale'
    case 'wifi_disconnected':
      return 'Wi-Fi disconnected'
    case 'unapproved_ssid':
      return 'Wrong SSID'
    case 'hotspot_profile_missing':
      return 'Profile missing'
    case 'approved_hotspot_adapter_missing':
      return 'AP dongle missing'
    case 'scan_adapter_missing':
      return 'Scan radio missing'
    case 'hotspot_not_visible':
      return 'AP not visible'
    case 'remote_reachability_failed':
      return 'Remote check failed'
    case 'none':
      return 'None'
    default:
      return 'Unknown'
  }
}

function formatHotspotProfilePresence(systemStatus: SystemStatusResponse | null): string {
  const value = systemStatus?.network.hotspotProfilePresent ?? null
  if (value === true) {
    return 'Present'
  }
  if (value === false) {
    return 'Missing'
  }
  return 'Unknown'
}

function formatHotspotAdapter(systemStatus: SystemStatusResponse | null): string {
  const network = systemStatus?.network
  if (!network) {
    return 'Unknown'
  }

  if (network.hotspotAdapterApproved === true) {
    return network.hotspotDevice ?? 'Approved'
  }

  if (network.hotspotDevice) {
    return `${network.hotspotDevice} (unapproved)`
  }

  if (network.hotspotAdapterApproved === false) {
    return 'Unavailable'
  }

  return 'Unknown'
}

function formatScanRadio(systemStatus: SystemStatusResponse | null): string {
  const network = systemStatus?.network
  if (!network) {
    return 'Unknown'
  }

  if (network.scanAdapterPresent === true) {
    return network.hotspotScanDevice ?? 'Available'
  }

  if (network.scanAdapterPresent === false) {
    return 'Unavailable'
  }

  return 'Unknown'
}

function formatHotspotVisibility(systemStatus: SystemStatusResponse | null): string {
  if (systemStatus?.network.scanAdapterPresent === false) {
    return 'Check unavailable'
  }

  const visibility = systemStatus?.network.hotspotSsidVisibleFromLaptop ?? null
  if (visibility === true) {
    return 'Visible'
  }
  if (visibility === false) {
    return 'Not visible'
  }
  return 'Check unavailable'
}

function getWirelessRecoveryCopy(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean,
  primaryApprovedSsid: string | null
): string {
  if (isLoading) {
    return 'Checking host hotspot telemetry and verification state.'
  }

  if (isError || !systemStatus) {
    return 'Unable to load the current host hotspot state right now.'
  }

  const approvedSsidLabel =
    primaryApprovedSsid ?? systemStatus.network.hotspotSsid ?? 'the approved hotspot'
  switch (systemStatus.network.issueCode) {
    case 'wifi_disconnected':
      return `Reconnect this laptop to ${approvedSsidLabel}, then requeue a host repair if the hotspot still needs attention.`
    case 'unapproved_ssid':
      return `This laptop is on the wrong SSID. Reconnect it to ${approvedSsidLabel}, or requeue a host repair if the hotspot needs to be rebuilt.`
    case 'hotspot_profile_missing':
      return 'The host server is missing the managed hotspot profile. Requeue a host repair to recreate it.'
    case 'approved_hotspot_adapter_missing':
      return 'The host server cannot find an approved AP dongle. Re-seat the external adapter, then requeue a host repair.'
    case 'scan_adapter_missing':
      return 'Hotspot hosting is configured, but Sentinel cannot verify visibility because no second Wi-Fi radio is available.'
    case 'hotspot_not_visible':
      return `Sentinel cannot see ${approvedSsidLabel} from the scan radio yet. Requeue a host repair after checking the AP dongle seating.`
    case 'telemetry_unavailable':
      return 'The host telemetry snapshot is unavailable. Requeue a host repair to reprovision the hotspot and refresh telemetry.'
    default:
      return 'Reconnect this laptop to the approved hotspot SSID, or ask the host server to requeue a hotspot repair.'
  }
}

function resolveRemoteSystemIpAddress(
  session: SystemStatusResponse['remoteSystems']['sessions'][number],
  systemStatus: SystemStatusResponse | null
): string {
  if (
    session.remoteSystemCode === DEPLOYMENT_REMOTE_SYSTEM_CODE &&
    systemStatus?.network.hostIpAddress
  ) {
    return systemStatus.network.hostIpAddress
  }

  return session.ipAddress ?? 'IP unavailable'
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'unknown'
  }

  const timestamp = new Date(value)

  if (Number.isNaN(timestamp.getTime())) {
    return 'unknown'
  }

  return timestamp.toLocaleTimeString()
}

function formatRecentTimestamp(value: string): string {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Recent'
  }

  const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 1000))
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`
  }

  const deltaMinutes = Math.round(deltaSeconds / 60)
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`
  }

  return timestamp.toLocaleTimeString()
}

function formatDetailedTimestamp(value: string | null): string {
  if (!value) {
    return 'unknown'
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'unknown'
  }

  return timestamp.toLocaleString()
}

function formatTelemetryAge(ageSeconds: number | null): string {
  if (ageSeconds === null) {
    return 'unknown'
  }

  if (ageSeconds < 60) {
    return `${ageSeconds}s old`
  }

  const minutes = Math.floor(ageSeconds / 60)
  const seconds = ageSeconds % 60

  if (seconds === 0) {
    return `${minutes}m old`
  }

  return `${minutes}m ${seconds}s old`
}

function joinTooltipLines(lines: Array<string | null | undefined>): string {
  return lines
    .filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
    .join('\n')
}

function getSystemSummaryBadge(input: {
  systemStatus: SystemStatusResponse | null
  isLoading: boolean
  isError: boolean
}): { dot: string; label: string; badgeStatus: AppBadgeStatus } {
  if (input.isError) {
    return { dot: 'status-error', label: 'Unavailable', badgeStatus: 'error' }
  }

  if (input.isLoading || !input.systemStatus) {
    return { dot: 'status-warning', label: 'Checking...', badgeStatus: 'warning' }
  }

  switch (input.systemStatus.overall.status) {
    case 'healthy':
      return { dot: 'status-success', label: 'Healthy', badgeStatus: 'success' }
    case 'warning':
    case 'unknown':
      return {
        dot: 'status-warning',
        label: input.systemStatus.overall.label,
        badgeStatus: 'warning',
      }
    case 'error':
      return { dot: 'status-error', label: input.systemStatus.overall.label, badgeStatus: 'error' }
    default:
      return { dot: 'status-neutral', label: 'Unknown', badgeStatus: 'neutral' }
  }
}

function getHealthBadgeStatus(
  status: SystemHealthStatus,
  isLoading: boolean,
  isError: boolean
): AppBadgeStatus {
  if (isLoading) {
    return 'warning'
  }

  if (isError) {
    return 'error'
  }

  switch (status) {
    case 'healthy':
      return 'success'
    case 'warning':
    case 'unknown':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'neutral'
  }
}

function getBackendStatus(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean
): AppBadgeStatus {
  if (isLoading) {
    return 'warning'
  }

  if (isError || !systemStatus) {
    return 'error'
  }

  return systemStatus.backend.status === 'healthy' ? 'success' : 'error'
}

function getBackendValue(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean
): string {
  if (isLoading) {
    return 'Checking...'
  }

  if (isError || !systemStatus) {
    return 'Unavailable'
  }

  return systemStatus.backend.status === 'healthy' ? 'Healthy' : 'Unavailable'
}

function getBackendTooltip(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean,
  backendLocation: string
): string {
  if (isLoading) {
    return 'Yellow because Sentinel is still checking the backend API status.'
  }

  if (isError || !systemStatus) {
    return joinTooltipLines([
      'Red because the frontend could not load authenticated system status from the backend API.',
      `Target: ${backendLocation}`,
    ])
  }

  return joinTooltipLines([
    'Green because the backend API returned the latest authenticated system-status payload successfully.',
    `Target: ${backendLocation}`,
    `Environment: ${systemStatus.backend.environment}`,
    `Last service timestamp: ${formatDetailedTimestamp(systemStatus.backend.serviceTimestamp)}`,
  ])
}

function resolveBackendLocation(browserOrigin: string): string {
  const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ''

  if (configuredApiBase.length > 0) {
    const normalized = configuredApiBase.replace(/\/+$/, '')
    return stripUrlProtocol(`${normalized}/health`)
  }

  return stripUrlProtocol(`${browserOrigin}/healthz`)
}

function getDatabaseStatus(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean
): AppBadgeStatus {
  if (isLoading) {
    return 'warning'
  }

  if (isError || !systemStatus) {
    return 'error'
  }

  return systemStatus.database.healthy ? 'success' : 'error'
}

function getDatabaseValue(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean
): string {
  if (isLoading) {
    return 'Checking...'
  }

  if (isError || !systemStatus) {
    return 'Unavailable'
  }

  return systemStatus.database.healthy ? 'Healthy' : 'Unavailable'
}

function getDatabaseTooltip(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean,
  databaseLocation: string
): string {
  if (isLoading) {
    return 'Yellow because Sentinel is still running the database health probe.'
  }

  if (isError || !systemStatus) {
    return joinTooltipLines([
      'Red because the frontend could not load database health from the backend.',
      `Database target: ${databaseLocation}`,
    ])
  }

  if (systemStatus.database.healthy) {
    return joinTooltipLines([
      'Green because the backend database probe succeeded.',
      `Database target: ${databaseLocation}`,
    ])
  }

  return joinTooltipLines([
    'Red because the backend database probe failed.',
    `Database target: ${databaseLocation}`,
  ])
}

function getNetworkValue(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean
): string {
  if (isLoading) {
    return 'Checking...'
  }

  if (isError || !systemStatus) {
    return 'Unavailable'
  }

  switch (systemStatus.network.status) {
    case 'healthy':
      return 'Healthy'
    case 'warning':
      return 'Warning'
    case 'error':
      return 'Offline'
    default:
      return 'Unknown'
  }
}

function getNetworkMessage(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean
): string {
  if (isLoading) {
    return 'Checking host network telemetry...'
  }

  if (isError || !systemStatus) {
    return 'Unable to load host network telemetry.'
  }

  return systemStatus.network.message
}

function getNetworkTooltip(
  systemStatus: SystemStatusResponse | null,
  isLoading: boolean,
  isError: boolean,
  isDevelopmentEnvironment: boolean
): string {
  if (isLoading) {
    return 'Yellow because Sentinel is still checking host network telemetry.'
  }

  if (isError || !systemStatus) {
    return 'Red because the frontend could not load host network telemetry from the backend.'
  }

  const network = systemStatus.network
  const currentSsid = network.currentSsid ?? 'unknown'
  const approvedSsids =
    network.approvedSsids.length > 0 ? network.approvedSsids.join(', ') : 'none configured'
  const remoteTarget = network.remoteTarget ?? 'not configured'

  let reason = `Yellow because ${network.message}.`

  switch (network.issueCode) {
    case 'telemetry_unavailable':
      reason = isDevelopmentEnvironment
        ? 'Green because this is a development build and host telemetry is optional.'
        : 'Yellow because host telemetry is unavailable.'
      break
    case 'telemetry_stale':
      reason = `Yellow because the host network snapshot is stale (${formatTelemetryAge(network.telemetryAgeSeconds)}).`
      break
    case 'wifi_disconnected':
      reason = 'Red because Wi-Fi is disconnected.'
      break
    case 'unapproved_ssid':
      reason = `Yellow because "${currentSsid}" is not in the approved Wi-Fi allowlist.`
      break
    case 'hotspot_profile_missing':
      reason = 'Yellow because the managed host hotspot profile is missing.'
      break
    case 'approved_hotspot_adapter_missing':
      reason = 'Yellow because no approved AP dongle is available for the hosted hotspot.'
      break
    case 'scan_adapter_missing':
      reason =
        'Yellow because Sentinel cannot find a second Wi-Fi radio to verify hotspot visibility.'
      break
    case 'hotspot_not_visible': {
      const hotspotSsidLabel = network.hotspotSsid ?? 'approved hotspot'
      reason = `Yellow because "${hotspotSsidLabel}" is not visible from the laptop Wi-Fi adapter.`
      break
    }
    case 'remote_reachability_failed':
      reason = `Yellow because the remote reachability check to ${network.remoteTarget} failed.`
      break
    case 'none':
    default:
      break
  }

  if (
    network.issueCode === 'none' &&
    network.telemetryAvailable &&
    network.wifiConnected === true
  ) {
    if (network.approvedSsids.length === 0) {
      reason = 'Green because Wi-Fi is connected and no approved SSID allowlist is configured.'
    } else if (network.approvedSsid === true) {
      reason = `Green because "${currentSsid}" is approved.`
    } else {
      reason = `Green because ${network.message}.`
    }
  }

  return joinTooltipLines([
    reason,
    `Detail: ${network.message}`,
    `Issue: ${formatNetworkIssueLabel(network.issueCode)}`,
    `SSID: ${currentSsid}`,
    `Approved SSIDs: ${approvedSsids}`,
    `AP profile: ${formatHotspotProfilePresence(systemStatus)}`,
    `AP adapter: ${formatHotspotAdapter(systemStatus)}`,
    `Scan radio: ${formatScanRadio(systemStatus)}`,
    `AP visibility: ${formatBooleanLabel(network.hotspotSsidVisibleFromLaptop)}`,
    `Remote target: ${remoteTarget}`,
    `Remote reachable: ${formatBooleanLabel(network.remoteReachable)}`,
    `Telemetry age: ${formatTelemetryAge(network.telemetryAgeSeconds)}`,
    `Snapshot time: ${formatDetailedTimestamp(network.generatedAt)}`,
  ])
}

function getWikiStatus(wikiBaseUrl: string): AppBadgeStatus {
  if (!wikiBaseUrl) {
    return 'neutral'
  }

  return 'success'
}

function getWikiValue(wikiBaseUrl: string): string {
  if (!wikiBaseUrl) {
    return 'Unknown'
  }

  return 'Available'
}

function getWikiTooltip(wikiBaseUrl: string, wikiLocation: string): string {
  if (!wikiBaseUrl) {
    return 'Gray because no Wiki base URL is configured for this environment.'
  }

  return joinTooltipLines([
    'Green because the frontend resolved a Wiki URL for this environment.',
    `Target: ${wikiLocation}`,
    'This pill is configuration-based and does not perform a live Wiki health check.',
  ])
}

function getFrontendTooltip(browserOrigin: string): string {
  return joinTooltipLines([
    'Green because the current admin UI is loaded in this browser session.',
    `Origin: ${stripUrlProtocol(browserOrigin)}`,
    'This reflects frontend availability in the current tab, not a separate remote probe.',
  ])
}

function formatBooleanLabel(value: boolean | null): string {
  if (value === null) {
    return 'unknown'
  }

  return value ? 'yes' : 'no'
}

function stripUrlProtocol(value: string): string {
  return value.replace(/^https?:\/\//, '')
}

function resolveWikiBaseUrl(configuredWikiBase: string, browserOrigin: string): string {
  if (configuredWikiBase.length > 0) {
    return configuredWikiBase.replace(/\/+$/, '')
  }

  const parsedOrigin = safeParseUrl(browserOrigin)
  if (!parsedOrigin) {
    return ''
  }

  const protocol = parsedOrigin?.protocol === 'https:' ? 'https:' : 'http:'
  const hostname = parsedOrigin?.hostname?.toLowerCase() ?? ''
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  const wikiUrl = new globalThis.URL(parsedOrigin.origin)

  if (isLocalHost) {
    wikiUrl.protocol = protocol
    wikiUrl.port = WIKI_LOCAL_DEV_PORT
    return wikiUrl.origin
  }

  wikiUrl.protocol = protocol
  wikiUrl.port = WIKI_LAN_FALLBACK_PORT
  return wikiUrl.origin
}

function safeParseUrl(value: string) {
  try {
    return new globalThis.URL(value)
  } catch {
    return null
  }
}

function isSystemUpdateJobTerminal(
  job: Pick<SystemUpdateJob, 'status' | 'finishedAt'> | null
): boolean {
  if (!job) {
    return true
  }

  if (job.status === 'rollback_attempted') {
    return job.finishedAt !== null
  }

  return job.status === 'completed' || job.status === 'failed' || job.status === 'rolled_back'
}

function formatSystemUpdateStatus(status: SystemUpdateJobStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function getVersionStatus(currentVersion: string, latestTag: string | null): string {
  const normalizedCurrent = normalizeVersionTag(currentVersion)
  const normalizedLatest = normalizeVersionTag(latestTag)

  if (!normalizedCurrent || !normalizedLatest) {
    return 'unknown'
  }

  const comparison = compareVersionTags(normalizedCurrent, normalizedLatest)
  if (comparison === 0) {
    return 'Current'
  }

  if (comparison < 0) {
    return `${normalizedLatest} Available`
  }

  return `Ahead of ${normalizedLatest}`
}

function normalizeVersionTag(version: string | null): string | null {
  if (!version) {
    return null
  }

  const trimmed = version.trim()
  if (trimmed.length === 0 || trimmed.toLowerCase() === 'unknown') {
    return null
  }

  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`
}

function compareVersionTags(left: string, right: string): number {
  const leftParts = parseVersionParts(left)
  const rightParts = parseVersionParts(right)

  for (let index = 0; index < 3; index += 1) {
    const delta = leftParts[index] - rightParts[index]
    if (delta !== 0) {
      return delta
    }
  }

  return 0
}

function parseVersionParts(tag: string): [number, number, number] {
  const cleaned = tag.startsWith('v') ? tag.slice(1) : tag
  const [majorRaw, minorRaw, patchRaw] = cleaned.split('.')
  const major = Number.parseInt(majorRaw ?? '0', 10)
  const minor = Number.parseInt(minorRaw ?? '0', 10)
  const patch = Number.parseInt((patchRaw ?? '0').split('-')[0] ?? '0', 10)

  return [
    Number.isNaN(major) ? 0 : major,
    Number.isNaN(minor) ? 0 : minor,
    Number.isNaN(patch) ? 0 : patch,
  ]
}

interface StatusRowProps {
  label: string
  subtitle?: string
  status: AppBadgeStatus
  value: string
  tooltip?: string
}

function StatusRow({ label, subtitle, status, value, tooltip }: StatusRowProps) {
  const statusClass = getDaisyStatusClass(status)
  const shouldPulse = status === 'error'
  const badge = (
    <AppBadge status={status} size="sm">
      {value}
    </AppBadge>
  )

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-(--space-2)">
          <div className="inline-grid *:[grid-area:1/1]" aria-hidden>
            {shouldPulse && <div className={cn('status animate-ping', statusClass)} />}
            <div className={cn('status', statusClass)} />
          </div>
          <p className="text-sm leading-tight">{label}</p>
        </div>
        {subtitle && <p className="text-[11px] text-base-content/60">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {tooltip ? (
          <div
            className={cn(
              'tooltip tooltip-left shrink-0 hover:z-(--z-tooltip) focus-within:z-(--z-tooltip)',
              'before:w-[18rem] before:max-w-[calc(100vw-var(--space-8))] before:whitespace-pre-wrap before:text-left before:text-[11px] before:leading-relaxed before:normal-case'
            )}
            data-tip={tooltip}
            title={tooltip}
            tabIndex={0}
          >
            {badge}
          </div>
        ) : (
          badge
        )}
      </div>
    </div>
  )
}

function getDaisyStatusClass(status: AppBadgeStatus): string {
  switch (status) {
    case 'success':
      return 'status-success'
    case 'warning':
      return 'status-warning'
    case 'error':
      return 'status-error'
    default:
      return 'status-neutral'
  }
}
