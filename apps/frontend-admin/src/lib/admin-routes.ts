export interface AdminNavRoute {
  href: `/${string}`
  label: string
}

export const ADMIN_NAV_ROUTES = [
  { href: '/settings', label: 'Settings' },
  { href: '/badges', label: 'Badges' },
  { href: '/database', label: 'Database' },
  { href: '/logs', label: 'Logs' },
] as const satisfies readonly AdminNavRoute[]

export function isAdminNavPath(pathname: string): boolean {
  return ADMIN_NAV_ROUTES.some((route) => route.href === pathname)
}
