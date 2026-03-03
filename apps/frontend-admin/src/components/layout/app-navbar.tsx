'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, PanelLeftOpen } from 'lucide-react'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'
import { HelpButton } from '@/components/help/HelpButton'
import { useBackendHealth } from '@/hooks/use-backend-health'
import { TID } from '@/lib/test-ids'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dds', label: 'DDS' },
  { href: '/members', label: 'Members' },
  { href: '/badges', label: 'Badges' },
  { href: '/events', label: 'Events' },
  { href: '/schedules', label: 'Schedules' },
]

const adminLinks = [
  { href: '/admin-users', label: 'User Accounts' },
  { href: '/kiosk', label: 'Kiosk' },
  { href: '/checkins', label: 'History' },
  { href: '/database', label: 'Database' },
  { href: '/settings', label: 'Settings' },
  { href: '/logs', label: 'Logs' },
]

interface AppNavbarProps {
  drawerId: string
  isDrawerOpen: boolean
}

const statusConfig = {
  connected: { dot: 'status-success', label: 'Connected', badgeStatus: 'success' },
  disconnected: { dot: 'status-error', label: 'Disconnected', badgeStatus: 'error' },
  checking: { dot: 'status-warning', label: 'Checking...', badgeStatus: 'warning' },
} as const

export function AppNavbar({ drawerId, isDrawerOpen }: AppNavbarProps) {
  const pathname = usePathname()
  const backendHealth = useBackendHealth()
  const { dot, label, badgeStatus } = statusConfig[backendHealth.status]
  const isAdminRoute = adminLinks.some((link) => pathname === link.href)

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
        <Link
          href="/dashboard"
          className="btn btn-ghost max-w-48 truncate px-2 text-lg font-bold sm:max-w-none sm:px-4 sm:text-2xl"
          data-testid={TID.nav.logo}
        >
          HMCS Chippawa
        </Link>
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
            <details>
              <summary
                className={cn('inline-flex items-center gap-1', isAdminRoute && 'active')}
                data-testid={TID.nav.link('admin')}
              >
                Admin
              </summary>
              <ul className="z-20 w-56 rounded-box bg-base-100 p-2 text-base-content shadow-xl">
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
            </details>
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
            className="dropdown-content card card-sm mt-2 w-72 border border-base-300 bg-base-100 text-base-content shadow-xl z-(--z-popover)"
            data-testid={TID.nav.backendStatusDetails}
          >
            <div className="card-body gap-2 p-(--space-3)">
              <p className="text-xs font-semibold uppercase tracking-wide">System Status</p>
              <StatusRow label="Frontend" status="success" value="Online" />
              <StatusRow
                label="Backend API"
                status={badgeStatus}
                value={backendHealth.status === 'checking' ? 'Checking...' : label}
              />
              <StatusRow
                label="Database"
                status={getDatabaseStatus(backendHealth)}
                value={backendHealth.details?.databaseHealthy ? 'Healthy' : 'Unavailable'}
              />
              <div className="mt-1 border-t border-base-300 pt-2 text-xs text-base-content/75">
                <p>
                  Version:{' '}
                  <span className="font-mono text-base-content">
                    {backendHealth.details?.version ?? 'unknown'}
                  </span>
                </p>
                <p>
                  Environment:{' '}
                  <span className="font-mono text-base-content">
                    {backendHealth.details?.environment ?? 'unknown'}
                  </span>
                </p>
                <p>
                  Uptime:{' '}
                  <span className="font-mono text-base-content">
                    {formatUptime(backendHealth.details?.uptimeSeconds)}
                  </span>
                </p>
                <p>
                  Last Check:{' '}
                  <span className="font-mono text-base-content">
                    {formatTimestamp(
                      backendHealth.details?.serviceTimestamp ?? backendHealth.lastCheckedAt
                    )}
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

function getDatabaseStatus(backendHealth: ReturnType<typeof useBackendHealth>): AppBadgeStatus {
  if (backendHealth.status === 'checking') {
    return 'warning'
  }

  if (!backendHealth.details) {
    return 'neutral'
  }

  return backendHealth.details.databaseHealthy ? 'success' : 'error'
}

interface StatusRowProps {
  label: string
  status: AppBadgeStatus
  value: string
}

function StatusRow({ label, status, value }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-base-content/75">{value}</span>
        <AppBadge status={status} size="sm">
          {status === 'success'
            ? 'OK'
            : status === 'error'
              ? 'DOWN'
              : status === 'warning'
                ? 'WAIT'
                : 'N/A'}
        </AppBadge>
      </div>
    </div>
  )
}
