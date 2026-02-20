'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'
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
  connected: { color: 'badge-success', dot: 'status-success', label: 'Connected' },
  disconnected: { color: 'badge-error', dot: 'status-error', label: 'Disconnected' },
  checking: { color: 'badge-warning', dot: 'status-warning', label: 'Checking...' },
} as const

export function AppNavbar({ drawerId, isDrawerOpen }: AppNavbarProps) {
  const pathname = usePathname()
  const backendStatus = useBackendHealth()
  const { dot, label } = statusConfig[backendStatus]
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
          className="btn btn-ghost max-w-[12rem] truncate px-2 text-lg font-bold sm:max-w-none sm:px-4 sm:text-2xl"
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
        <span
          className="badge badge-outline badge-sm sm:badge-md md:badge-xl"
          data-testid={TID.nav.backendStatus}
        >
          <span className={cn('status', dot)} />
          <span className="hidden sm:inline">{label}</span>
        </span>
        <UserMenu />
      </div>
    </div>
  )
}
