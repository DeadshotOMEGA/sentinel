'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, PanelLeftOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'
import { useBackendHealth } from '@/hooks/use-backend-health'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/checkins', label: 'Check-ins' },
  { href: '/events', label: 'Events' },
  { href: '/schedules', label: 'Schedules' },
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
  const { color, dot, label } = statusConfig[backendStatus]

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
        <Link href="/dashboard" className="btn btn-ghost text-2xl font-bold">
          HMCS Chippawa
        </Link>
      </div>

      {/* Navigation Links - hidden on mobile, visible on desktop */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu text-lg menu-horizontal px-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={cn(pathname === link.href && 'active')}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-end">
        <span className="badge badge-outline badge-xl">
          <span className={cn('status', dot)} />
          {label}
        </span>
      </div>
    </div>
  )
}
