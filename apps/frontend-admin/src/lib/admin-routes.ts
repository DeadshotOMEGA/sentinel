export const ADMIN_ROLE_LEVEL = {
  ADMIN: 5,
  DEVELOPER: 6,
} as const

export type AdminCapability =
  | 'admin:view'
  | 'updates:manage'
  | 'network:manage'
  | 'logs:view'
  | 'database:view'
  | 'badges:manage'
  | 'config:manage'

export type AdminRouteId =
  | 'admin-home'
  | 'updates'
  | 'network'
  | 'logs'
  | 'database'
  | 'badges'
  | 'config'

export type AdminRouteGroup =
  | 'Overview'
  | 'System Operations'
  | 'Infrastructure'
  | 'Diagnostics'
  | 'Access Control'
  | 'System Definitions'

export type AdminRouteTier = 1 | 2
export type AdminNavVisibility = 'sidebar' | 'hidden'
export type AdminFeatureStatus = 'available' | 'future'

export type AdminIconKey =
  | 'activity'
  | 'badge'
  | 'book-open'
  | 'database'
  | 'download'
  | 'list'
  | 'logs'
  | 'network'
  | 'shield'
  | 'terminal'

export interface AdminNavRoute {
  id: AdminRouteId
  label: string
  href: `/admin${string}`
  group: AdminRouteGroup
  tier: AdminRouteTier
  icon: AdminIconKey
  description: string
  aliases: readonly string[]
  keywords: readonly string[]
  searchWeight: number
  requiredRole: number
  requiredCapabilities: readonly AdminCapability[]
  navVisibility: AdminNavVisibility
  featureStatus: AdminFeatureStatus
}

export type AdminQuickActionId =
  | 'open-updates'
  | 'view-logs'
  | 'add-badge'
  | 'configure-network'
  | 'open-database'
  | 'open-config'
  | 'backup-now'
  | 'export-database'

export interface AdminQuickAction {
  id: AdminQuickActionId
  label: string
  href: `/admin${string}`
  icon: AdminIconKey
  description: string
  requiredCapabilities: readonly AdminCapability[]
  defaultPinned: boolean
  featureStatus: AdminFeatureStatus
}

export const ADMIN_NAV_ROUTES = [
  {
    id: 'admin-home',
    label: 'Overview',
    href: '/admin',
    group: 'Overview',
    tier: 1,
    icon: 'shield',
    description: 'System state, current issues, quick actions, and recent admin activity.',
    aliases: ['admin home', 'control center', 'control centre'],
    keywords: ['admin', 'overview', 'status', 'health', 'issues'],
    searchWeight: 100,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
  {
    id: 'updates',
    label: 'Updates',
    href: '/admin/updates',
    group: 'System Operations',
    tier: 1,
    icon: 'download',
    description: 'Review installed version, update availability, updater activity, and trace logs.',
    aliases: ['upgrade', 'release', 'version', 'system update'],
    keywords: ['updates', 'upgrade', 'release notes', 'version', 'trace'],
    searchWeight: 95,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view', 'updates:manage'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
  {
    id: 'network',
    label: 'Network',
    href: '/admin/network',
    group: 'Infrastructure',
    tier: 1,
    icon: 'network',
    description: 'Manage approved Wi-Fi, remote systems, hotspot recovery, and host network state.',
    aliases: ['wifi', 'wi-fi', 'hotspot', 'remote systems'],
    keywords: ['network', 'wifi', 'hotspot', 'remote', 'infrastructure'],
    searchWeight: 90,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view', 'network:manage'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
  {
    id: 'logs',
    label: 'Logs',
    href: '/admin/logs',
    group: 'Diagnostics',
    tier: 1,
    icon: 'logs',
    description: 'Review audit activity and operational changes across Sentinel.',
    aliases: ['activity log', 'audit', 'events log'],
    keywords: ['logs', 'audit', 'activity', 'diagnostics', 'history'],
    searchWeight: 85,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view', 'logs:view'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
  {
    id: 'database',
    label: 'Database',
    href: '/admin/database',
    group: 'Diagnostics',
    tier: 1,
    icon: 'database',
    description: 'Read-only database explorer for controlled diagnostics.',
    aliases: ['db', 'data explorer', 'tables'],
    keywords: ['database', 'tables', 'diagnostics', 'read only', 'explorer'],
    searchWeight: 78,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view', 'database:view'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
  {
    id: 'badges',
    label: 'Badges',
    href: '/admin/badges',
    group: 'Access Control',
    tier: 1,
    icon: 'badge',
    description: 'Manage badge inventory, assignments, and operational badge status.',
    aliases: ['cards', 'nfc', 'rfid', 'access badges'],
    keywords: ['badges', 'access', 'cards', 'nfc', 'rfid'],
    searchWeight: 88,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view', 'badges:manage'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
  {
    id: 'config',
    label: 'System Definitions',
    href: '/admin/config',
    group: 'System Definitions',
    tier: 1,
    icon: 'list',
    description:
      'Manage member types, statuses, visit types, event types, qualifications, and tags.',
    aliases: ['settings', 'definitions', 'lists', 'types', 'configuration'],
    keywords: ['definitions', 'settings', 'types', 'statuses', 'tags', 'qualifications'],
    searchWeight: 80,
    requiredRole: ADMIN_ROLE_LEVEL.ADMIN,
    requiredCapabilities: ['admin:view', 'config:manage'],
    navVisibility: 'sidebar',
    featureStatus: 'available',
  },
] as const satisfies readonly AdminNavRoute[]

export const ADMIN_QUICK_ACTIONS = [
  {
    id: 'open-updates',
    label: 'Open updates',
    href: '/admin/updates',
    icon: 'download',
    description: 'Review version state, release notes, and update progress.',
    requiredCapabilities: ['admin:view', 'updates:manage'],
    defaultPinned: true,
    featureStatus: 'available',
  },
  {
    id: 'view-logs',
    label: 'View logs',
    href: '/admin/logs',
    icon: 'logs',
    description: 'Inspect recent administrative and operational activity.',
    requiredCapabilities: ['admin:view', 'logs:view'],
    defaultPinned: true,
    featureStatus: 'available',
  },
  {
    id: 'add-badge',
    label: 'Add badge',
    href: '/admin/badges?action=create',
    icon: 'badge',
    description: 'Register a new badge and assign it when ready.',
    requiredCapabilities: ['admin:view', 'badges:manage'],
    defaultPinned: true,
    featureStatus: 'available',
  },
  {
    id: 'configure-network',
    label: 'Configure network',
    href: '/admin/network',
    icon: 'network',
    description: 'Review Wi-Fi allowlist and managed remote systems.',
    requiredCapabilities: ['admin:view', 'network:manage'],
    defaultPinned: true,
    featureStatus: 'available',
  },
  {
    id: 'open-database',
    label: 'Open database',
    href: '/admin/database',
    icon: 'database',
    description: 'Open the read-only database explorer.',
    requiredCapabilities: ['admin:view', 'database:view'],
    defaultPinned: false,
    featureStatus: 'available',
  },
  {
    id: 'open-config',
    label: 'System definitions',
    href: '/admin/config',
    icon: 'list',
    description: 'Manage operational dictionaries and default definitions.',
    requiredCapabilities: ['admin:view', 'config:manage'],
    defaultPinned: false,
    featureStatus: 'available',
  },
  {
    id: 'backup-now',
    label: 'Backup now',
    href: '/admin/database',
    icon: 'database',
    description: 'Reserved for future appliance backup APIs.',
    requiredCapabilities: ['admin:view', 'database:view'],
    defaultPinned: false,
    featureStatus: 'future',
  },
  {
    id: 'export-database',
    label: 'Export database',
    href: '/admin/database',
    icon: 'database',
    description: 'Reserved for future controlled database export APIs.',
    requiredCapabilities: ['admin:view', 'database:view'],
    defaultPinned: false,
    featureStatus: 'future',
  },
] as const satisfies readonly AdminQuickAction[]

export const ADMIN_SIDEBAR_GROUP_LIMIT = 6
export const ADMIN_SIDEBAR_LINK_LIMIT_PER_GROUP = 7

const capabilityByMinimumRole: Record<number, readonly AdminCapability[]> = {
  [ADMIN_ROLE_LEVEL.ADMIN]: [
    'admin:view',
    'updates:manage',
    'network:manage',
    'logs:view',
    'database:view',
    'badges:manage',
    'config:manage',
  ],
  [ADMIN_ROLE_LEVEL.DEVELOPER]: [
    'admin:view',
    'updates:manage',
    'network:manage',
    'logs:view',
    'database:view',
    'badges:manage',
    'config:manage',
  ],
}

export function getAdminCapabilities(
  accountLevel: number | null | undefined
): readonly AdminCapability[] {
  if ((accountLevel ?? 0) >= ADMIN_ROLE_LEVEL.DEVELOPER) {
    return capabilityByMinimumRole[ADMIN_ROLE_LEVEL.DEVELOPER]
  }

  if ((accountLevel ?? 0) >= ADMIN_ROLE_LEVEL.ADMIN) {
    return capabilityByMinimumRole[ADMIN_ROLE_LEVEL.ADMIN]
  }

  return []
}

export function hasAdminCapability(
  accountLevel: number | null | undefined,
  capability: AdminCapability
): boolean {
  return getAdminCapabilities(accountLevel).includes(capability)
}

export function hasAdminAccess(
  accountLevel: number | null | undefined,
  requiredRole: number,
  requiredCapabilities: readonly AdminCapability[]
): boolean {
  const capabilities = getAdminCapabilities(accountLevel)

  return (
    (accountLevel ?? 0) >= requiredRole &&
    requiredCapabilities.every((capability) => capabilities.includes(capability))
  )
}

export function hasAdminRouteAccess(
  route: AdminNavRoute,
  accountLevel: number | null | undefined
): boolean {
  return hasAdminAccess(accountLevel, route.requiredRole, route.requiredCapabilities)
}

export function hasAdminQuickActionAccess(
  action: AdminQuickAction,
  accountLevel: number | null | undefined
): boolean {
  return hasAdminAccess(accountLevel, ADMIN_ROLE_LEVEL.ADMIN, action.requiredCapabilities)
}

export function getAdminRouteById(id: AdminRouteId): AdminNavRoute {
  const route = ADMIN_NAV_ROUTES.find((item) => item.id === id)

  if (!route) {
    throw new Error(`Unknown admin route: ${id}`)
  }

  return route
}

export function getAdminRouteByHref(pathname: string): AdminNavRoute | null {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/admin'

  return (
    ADMIN_NAV_ROUTES.find((route) => {
      const normalizedHref = route.href.replace(/\/+$/, '') || '/admin'

      return normalizedPathname === normalizedHref
    }) ?? null
  )
}

export function getAdminSidebarRoutes(
  accountLevel: number | null | undefined
): readonly AdminNavRoute[] {
  return ADMIN_NAV_ROUTES.filter(
    (route) =>
      route.tier === 1 &&
      route.navVisibility === 'sidebar' &&
      route.featureStatus === 'available' &&
      hasAdminRouteAccess(route, accountLevel)
  )
}

export function getAdminRouteGroups(routes: readonly AdminNavRoute[]): readonly AdminRouteGroup[] {
  return Array.from(new Set(routes.map((route) => route.group)))
}

export function isAdminNavPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

export function resolveLegacyAdminPath(
  pathname: string,
  searchParams: globalThis.URLSearchParams
): `/admin${string}` | null {
  const query = new globalThis.URLSearchParams(searchParams.toString())

  if (pathname === '/badges') {
    return withQuery('/admin/badges', query)
  }

  if (pathname === '/database') {
    return withQuery('/admin/database', query)
  }

  if (pathname === '/logs') {
    return withQuery('/admin/logs', query)
  }

  if (pathname !== '/settings') {
    return null
  }

  const requestedTab = query.get('tab')

  if (requestedTab === 'updates') {
    query.delete('tab')
    return withQuery('/admin/updates', query)
  }

  if (requestedTab === 'network') {
    query.delete('tab')
    return withQuery('/admin/network', query)
  }

  return withQuery('/admin/config', query)
}

function withQuery(
  pathname: `/admin${string}`,
  searchParams: globalThis.URLSearchParams
): `/admin${string}` {
  const queryString = searchParams.toString()

  return queryString ? `${pathname}?${queryString}` : pathname
}
