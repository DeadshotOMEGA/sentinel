'use client'
/* global process */
/* global AbortController */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { SystemHealthStatus, SystemStatusResponse } from '@sentinel/contracts'
import { Menu, PanelLeftOpen } from 'lucide-react'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'
import { HelpButton } from '@/components/help/HelpButton'
import { useSystemStatus } from '@/hooks/use-system-status'
import { TID } from '@/lib/test-ids'
import { useAuthStore } from '@/store/auth-store'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/checkins', label: 'History' },
  { href: '/members', label: 'Members' },
  { href: '/events', label: 'Events' },
  { href: '/schedules', label: 'Schedules' },
]

const adminLinks = [
  { href: '/settings', label: 'Settings' },
  { href: '/badges', label: 'Badges' },
  { href: '/database', label: 'Database' },
  { href: '/logs', label: 'Logs' },
]

interface AppNavbarProps {
  drawerId: string
  isDrawerOpen: boolean
}

const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/DeadshotOMEGA/sentinel/releases/latest'
const WIKI_LAN_FALLBACK_PORT = '3020'
const WIKI_LOCAL_DEV_PORT = '3002'

interface LatestReleaseState {
  tag: string | null
  releaseUrl: string | null
  downloadUrl: string | null
}

export function AppNavbar({ drawerId, isDrawerOpen }: AppNavbarProps) {
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const systemStatusQuery = useSystemStatus({ enabled: isAuthenticated })
  const systemStatus = systemStatusQuery.data ?? null
  const isStatusLoading = !isAuthenticated || systemStatusQuery.isLoading
  const { dot, label, badgeStatus } = getSystemSummaryBadge({
    systemStatus,
    isLoading: isStatusLoading,
    isError: systemStatusQuery.isError,
  })
  const isAdminRoute = adminLinks.some((link) => pathname === link.href)
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
  const databaseStatus = getDatabaseStatus(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const databaseValue = getDatabaseValue(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const databaseLocation = systemStatus?.database.address ?? 'unknown'
  const networkStatus = getHealthBadgeStatus(
    systemStatus?.network.status ?? 'unknown',
    isStatusLoading,
    systemStatusQuery.isError
  )
  const networkValue = getNetworkValue(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const networkMessage = getNetworkMessage(systemStatus, isStatusLoading, systemStatusQuery.isError)
  const environment = (systemStatus?.backend.environment ?? 'unknown').toLowerCase()
  const isDevelopmentEnvironment = environment !== 'production'
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
  const activeRemoteSessions = systemStatus?.remoteSystems.sessions ?? []
  const remoteSystemOverflowCount = systemStatus?.remoteSystems.overflowCount ?? 0
  const shouldShowLaptopRecovery =
    systemStatus !== null &&
    [databaseStatus, backendStatus, networkStatus].some((status) => status !== 'success')
  const [latestRelease, setLatestRelease] = useState<LatestReleaseState>({
    tag: null,
    releaseUrl: null,
    downloadUrl: null,
  })
  const currentVersion = systemStatus?.backend.version ?? 'unknown'
  const versionStatusLabel = getVersionStatus(currentVersion, latestRelease.tag)
  const updateAvailable = isUpdateAvailable(currentVersion, latestRelease.tag)
  const updateTargetUrl = latestRelease.downloadUrl ?? latestRelease.releaseUrl

  useEffect(() => {
    const controller = new AbortController()

    async function fetchLatestRelease() {
      try {
        const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github+json' },
        })

        if (!response.ok) {
          return
        }

        const payload: unknown = await response.json()
        const release = parseLatestRelease(payload)
        setLatestRelease(release)
      } catch {
        // Release lookup is best-effort only; keep current version display even when unavailable.
      }
    }

    fetchLatestRelease()

    return () => {
      controller.abort()
    }
  }, [])

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
          <span className="px-2 text-lg font-bold sm:px-4 sm:text-2xl">HMCS Chippawa</span>
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
                {adminLinks.map((link) => (
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
              />
              <StatusRow
                label="Backend API"
                subtitle={backendLocation}
                status={backendStatus}
                value={backendValue}
              />
              <StatusRow
                label="Frontend"
                subtitle={stripUrlProtocol(browserOrigin)}
                status={frontendStatus}
                value={frontendValue}
              />
              <StatusRow
                label="Wiki"
                subtitle={wikiLocation}
                status={wikiStatus}
                value={wikiValue}
              />
              <StatusRow
                label="Network"
                subtitle={networkSubtitle}
                status={networkStatus}
                value={networkValue}
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
              {shouldShowLaptopRecovery && (
                <div
                  className={cn(
                    'mt-1 rounded-box border p-(--space-2)',
                    networkStatus === 'error'
                      ? 'border-warning/35 bg-warning-fadded text-warning-fadded-content'
                      : 'border-base-300 bg-base-200 text-base-content'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">Laptop Recovery</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Open the local Wi-Fi recovery helper if a captive portal is blocking internet or
                    Tailscale access on this laptop. If the helper is not enabled yet, use the
                    portal page button below.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-(--space-2)">
                    <a
                      href="sentinel-recover://run"
                      className={cn(
                        'btn btn-xs',
                        networkStatus === 'error' ? 'btn-warning' : 'btn-outline'
                      )}
                      data-testid={TID.nav.backendStatusRecovery}
                    >
                      Launch Wi-Fi Recovery
                    </a>
                    <a
                      href="http://neverssl.com"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs"
                    >
                      Open Portal Page
                    </a>
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
                {updateAvailable && latestRelease.tag && updateTargetUrl && (
                  <p>
                    <a
                      href={updateTargetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-primary text-xs"
                    >
                      Update to {latestRelease.tag}
                    </a>
                  </p>
                )}
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

function parseLatestRelease(payload: unknown): LatestReleaseState {
  if (!isRecord(payload)) {
    return { tag: null, releaseUrl: null, downloadUrl: null }
  }

  const tag = typeof payload.tag_name === 'string' ? payload.tag_name : null
  const releaseUrl = typeof payload.html_url === 'string' ? payload.html_url : null
  const assets = Array.isArray(payload.assets) ? payload.assets : []
  const downloadUrl = assets
    .map((asset) => {
      if (!isRecord(asset)) {
        return null
      }
      const url = typeof asset.browser_download_url === 'string' ? asset.browser_download_url : null
      const name = typeof asset.name === 'string' ? asset.name.toLowerCase() : ''
      if (!url || !name.endsWith('.deb')) {
        return null
      }
      return name.includes('sentinel') ? url : null
    })
    .find((url): url is string => typeof url === 'string')

  return { tag, releaseUrl, downloadUrl: downloadUrl ?? null }
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

function isUpdateAvailable(currentVersion: string, latestTag: string | null): boolean {
  const normalizedCurrent = normalizeVersionTag(currentVersion)
  const normalizedLatest = normalizeVersionTag(latestTag)

  if (!normalizedCurrent || !normalizedLatest) {
    return false
  }

  return compareVersionTags(normalizedCurrent, normalizedLatest) < 0
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

interface StatusRowProps {
  label: string
  subtitle?: string
  status: AppBadgeStatus
  value: string
}

function StatusRow({ label, subtitle, status, value }: StatusRowProps) {
  const statusClass = getDaisyStatusClass(status)
  const shouldPulse = status === 'error'

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
        <AppBadge status={status} size="sm">
          {value}
        </AppBadge>
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
