'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AdminIcon } from '@/components/admin/admin-icons'
import {
  getAdminRouteByHref,
  getAdminRouteGroups,
  getAdminSidebarRoutes,
  type AdminNavRoute,
} from '@/lib/admin-routes'
import { recordAdminNavigationTelemetry } from '@/lib/admin-navigation-telemetry'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const member = useAuthStore((state) => state.member)
  const accountLevel = member?.accountLevel ?? 0
  const sidebarRoutes = getAdminSidebarRoutes(accountLevel)
  const groups = getAdminRouteGroups(sidebarRoutes)
  const currentRoute = getAdminRouteByHref(pathname)

  return (
    <div className="grid min-h-[calc(100vh-7rem)] gap-(--space-5) rounded-box bg-base-300/40 p-(--space-4) xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="self-start rounded-box border border-base-300/80 bg-base-100 p-(--space-4) shadow-[var(--shadow-2)]">
        <div className="border-b border-base-300/70 pb-(--space-4)">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/45">
            Admin
          </p>
          <div className="mt-(--space-1) flex items-center justify-between gap-(--space-2)">
            <h2 className="font-display text-xl font-bold leading-tight">Control Center</h2>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="mt-(--space-4) space-y-(--space-5)">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-(--space-2) pb-(--space-2) text-[0.62rem] font-semibold uppercase tracking-wide text-base-content/42">
                {group}
              </p>
              <ul className="menu menu-sm w-full gap-(--space-1) p-0">
                {sidebarRoutes
                  .filter((route) => route.group === group)
                  .map((route) => (
                    <AdminSidebarLink
                      key={route.id}
                      route={route}
                      currentRouteId={currentRoute?.id ?? 'admin-home'}
                      active={
                        route.href === '/admin'
                          ? pathname === '/admin'
                          : pathname === route.href || pathname.startsWith(`${route.href}/`)
                      }
                    />
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <section
        aria-labelledby="admin-page-title"
        className="min-w-0 space-y-(--space-4)"
        data-admin-route={currentRoute?.id ?? 'unknown'}
      >
        {children}
      </section>
    </div>
  )
}

function AdminSidebarLink({
  route,
  currentRouteId,
  active,
}: {
  route: AdminNavRoute
  currentRouteId: AdminNavRoute['id']
  active: boolean
}) {
  return (
    <li>
      <Link
        href={route.href}
        className={cn(
          'grid min-h-14 grid-cols-[1.1rem_minmax(0,1fr)] items-center gap-(--space-3) rounded-box border-l-4 border-l-transparent px-(--space-3) py-(--space-2) text-base-content/90 transition-colors duration-(--duration-fast) hover:bg-base-200 hover:text-base-content',
          active && 'border-l-primary bg-base-200 text-base-content shadow-[var(--shadow-1)]'
        )}
        aria-current={active ? 'page' : undefined}
        onClick={() => {
          recordAdminNavigationTelemetry({
            eventType: 'nav_click',
            routeId: currentRouteId,
            targetRouteId: route.id,
            sourceType: 'sidebar',
          })
        }}
      >
        <AdminIcon
          icon={route.icon}
          className={cn('h-4 w-4 text-base-content/58', active && 'text-primary')}
        />
        <span className="min-w-0">
          <span className={cn('block truncate text-sm font-semibold', active && 'font-bold')}>
            {route.label}
          </span>
          <span
            className={cn(
              'block truncate text-xs leading-snug text-base-content/62',
              active && 'text-base-content/78'
            )}
          >
            {route.description}
          </span>
        </span>
      </Link>
    </li>
  )
}
