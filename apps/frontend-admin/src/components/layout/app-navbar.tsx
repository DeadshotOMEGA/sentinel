'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, PanelLeftOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/checkins', label: 'Check-ins' },
  { href: '/schedules', label: 'Schedules' },
  { href: '/database', label: 'Database' },
  { href: '/settings', label: 'Settings' },
  { href: '/logs', label: 'Logs' },
]

interface AppNavbarProps {
  drawerId: string
  isDrawerOpen: boolean
}

export function AppNavbar({ drawerId, isDrawerOpen }: AppNavbarProps) {
  const pathname = usePathname()

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

        {/* Logo */}
        <Link href="/dashboard" className="btn btn-ghost text-xl font-bold">
          HMCS Chippawa
        </Link>
      </div>

      {/* Navigation Links - hidden on mobile, visible on desktop */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
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
        <button className="btn btn-ghost btn-circle">
          <Search size={28} strokeWidth={1} />
        </button>
        <button className="btn btn-ghost btn-circle">
          <div className="indicator">
            <Bell size={28} strokeWidth={1} />
            <span className="badge badge-xs badge-secondary indicator-item"></span>
          </div>
        </button>
      </div>
    </div>
  )
}
