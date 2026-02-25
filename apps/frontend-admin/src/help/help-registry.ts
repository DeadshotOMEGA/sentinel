export type HelpRoleScope = 'basic' | 'member' | 'officer' | 'manager' | 'admin' | 'developer'

export type HelpFallbackMode = 'tour' | 'wiki' | 'local'

export interface HelpContext {
  routeId: string
  wikiSlug: string
  roleScopes: HelpRoleScope[]
  tourId?: string
  fallbackMode: HelpFallbackMode
}

export interface LocalHelpFallback {
  title: string
  summary: string
  quickSteps: string[]
}

interface HelpRegistryEntry extends HelpContext {
  pathPrefixes: string[]
  localFallback: LocalHelpFallback
}

export const HELP_START_HERE_ROUTE_ID = 'docs-start-here'
export const HELP_START_HERE_SLUG = 'docs/start-here'

const HELP_REGISTRY: HelpRegistryEntry[] = [
  {
    routeId: HELP_START_HERE_ROUTE_ID,
    pathPrefixes: [],
    wikiSlug: HELP_START_HERE_SLUG,
    roleScopes: ['basic', 'member', 'officer', 'manager', 'admin', 'developer'],
    fallbackMode: 'local',
    localFallback: {
      title: 'General Help',
      summary: 'Use role-based quick links and operational procedures to find the right workflow.',
      quickSteps: [
        'Confirm your current task and role assignment before taking action.',
        'Open the page-level Help button for route-specific instructions.',
        'Escalate to watch leadership for unresolved operational blockers.',
      ],
    },
  },
  {
    routeId: 'dashboard',
    pathPrefixes: ['/dashboard'],
    wikiSlug: 'operations/dashboard/overview',
    roleScopes: ['basic', 'member', 'officer', 'manager', 'admin', 'developer'],
    tourId: 'dashboard.admin.orientation.v1',
    fallbackMode: 'tour',
    localFallback: {
      title: 'Dashboard Quick Help',
      summary: 'Use alerts first, then verify readiness before quick actions.',
      quickSteps: [
        'Acknowledge critical alerts before starting lockup or check-in actions.',
        'Validate DDS, Duty Watch, Building, and Lockup Holder status blocks.',
        'Use Quick Actions only after confirming role handoff responsibilities.',
      ],
    },
  },
  {
    routeId: 'dds',
    pathPrefixes: ['/dds'],
    wikiSlug: 'operations/day-duty/dds-daily-workflow',
    roleScopes: ['officer', 'manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'DDS Quick Help',
      summary: 'Run checklist and contact actions in order and keep entries current.',
      quickSteps: [
        'Work top-to-bottom through the checklist and phone/contact sections.',
        'Record updates immediately after completing each procedural item.',
        'Escalate incomplete or blocked items before end-of-watch.',
      ],
    },
  },
  {
    routeId: 'members',
    pathPrefixes: ['/members'],
    wikiSlug: 'admin/members/member-records',
    roleScopes: ['manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Members Quick Help',
      summary: 'Use filters first, then apply edits with role-aware controls.',
      quickSteps: [
        'Filter by division, status, or qualification before large edits.',
        'Use bulk actions cautiously and confirm selected records.',
        'Re-run qualification sync after major membership updates.',
      ],
    },
  },
  {
    routeId: 'badges',
    pathPrefixes: ['/badges'],
    wikiSlug: 'admin/badges/badge-lifecycle',
    roleScopes: ['manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Badges Quick Help',
      summary: 'Treat badge state changes as auditable operations.',
      quickSteps: [
        'Verify serial number and assignment target before saving changes.',
        'Confirm status transitions align with current possession state.',
        'Document exceptional badge handling through approved notes/processes.',
      ],
    },
  },
  {
    routeId: 'events',
    pathPrefixes: ['/events'],
    wikiSlug: 'operations/events/event-management',
    roleScopes: ['member', 'officer', 'manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Events Quick Help',
      summary: 'Capture event details accurately to support duty planning.',
      quickSteps: [
        'Create events with correct category, timing, and location details.',
        'Review event status before assigning supporting duties.',
        'Update changed timings promptly to keep schedules accurate.',
      ],
    },
  },
  {
    routeId: 'schedules',
    pathPrefixes: ['/schedules'],
    wikiSlug: 'operations/schedules/dds-duty-watch-scheduling',
    roleScopes: ['officer', 'manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Schedules Quick Help',
      summary: 'Publish only after validating coverage and role eligibility.',
      quickSteps: [
        'Check week, month, or quarter views for assignment gaps.',
        'Validate member qualifications before finalizing role assignment.',
        'Publish schedules after second-person review when practical.',
      ],
    },
  },
  {
    routeId: 'checkins',
    pathPrefixes: ['/checkins'],
    wikiSlug: 'operations/day-duty/checkins-history-and-corrections',
    roleScopes: ['manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Check-In History Quick Help',
      summary: 'Treat edits as controlled corrections with clear rationale.',
      quickSteps: [
        'Filter by date, direction, and division before review.',
        'Use manual entries only for verified exceptions.',
        'Document reason when adjusting historical records.',
      ],
    },
  },
  {
    routeId: 'kiosk',
    pathPrefixes: ['/kiosk'],
    wikiSlug: 'operations/kiosk/kiosk-operations',
    roleScopes: ['manager', 'admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Kiosk Quick Help',
      summary: 'Kiosk mode is for controlled check-in flow and should stay operationally locked.',
      quickSteps: [
        'Confirm kiosk state before handing over to next operator.',
        'Keep scan station unobstructed and monitor invalid scan attempts.',
        'Escalate repeated badge failures to badge administration workflow.',
      ],
    },
  },
  {
    routeId: 'settings',
    pathPrefixes: ['/settings'],
    wikiSlug: 'technical/configuration/reference-data-settings',
    roleScopes: ['admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Settings Quick Help',
      summary: 'Reference settings changes affect operational behavior and reporting.',
      quickSteps: [
        'Apply changes in small batches and verify visible downstream impact.',
        'Avoid concurrent edits on the same enum domain.',
        'Record rationale for changes to shared operational categories.',
      ],
    },
  },
  {
    routeId: 'database',
    pathPrefixes: ['/database'],
    wikiSlug: 'technical/database/read-only-explorer',
    roleScopes: ['admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Database Explorer Quick Help',
      summary: 'Explorer is read-only and intended for controlled diagnostics.',
      quickSteps: [
        'Use table sidebar to narrow scope before sorting large datasets.',
        'Avoid sharing raw sensitive fields outside authorized channels.',
        'Escalate data anomalies through incident workflow, not direct edits.',
      ],
    },
  },
  {
    routeId: 'logs',
    pathPrefixes: ['/logs'],
    wikiSlug: 'technical/logs/live-operations-log-viewer',
    roleScopes: ['admin', 'developer'],
    fallbackMode: 'wiki',
    localFallback: {
      title: 'Logs Quick Help',
      summary: 'Use filtered, correlation-driven analysis during live incidents.',
      quickSteps: [
        'Filter by level and module before broad keyword searches.',
        'Track correlation IDs across related events.',
        'Pause live stream when triaging high-volume bursts.',
      ],
    },
  },
]

const HELP_BY_ROUTE_ID = new Map(HELP_REGISTRY.map((entry) => [entry.routeId, entry]))

const MATCHERS = HELP_REGISTRY.flatMap((entry) =>
  entry.pathPrefixes.map((prefix) => ({
    prefix,
    routeId: entry.routeId,
  }))
).sort((a, b) => b.prefix.length - a.prefix.length)

function normalizePathname(pathname: string): string {
  const pathWithoutHash = pathname.split('#')[0] ?? pathname
  const pathWithoutQuery = pathWithoutHash.split('?')[0] ?? pathWithoutHash
  if (pathWithoutQuery.length <= 1) return pathWithoutQuery
  return pathWithoutQuery.endsWith('/') ? pathWithoutQuery.slice(0, -1) : pathWithoutQuery
}

export function getRoleScopesForAccountLevel(accountLevel: number): HelpRoleScope[] {
  if (accountLevel >= 6) {
    return ['basic', 'member', 'officer', 'manager', 'admin', 'developer']
  }

  if (accountLevel >= 5) {
    return ['basic', 'member', 'officer', 'manager', 'admin']
  }

  if (accountLevel >= 4) {
    return ['basic', 'member', 'officer', 'manager']
  }

  if (accountLevel >= 3) {
    return ['basic', 'member', 'officer']
  }

  if (accountLevel >= 2) {
    return ['basic', 'member']
  }

  return ['basic']
}

export function resolveRouteIdFromPathname(pathname: string): string | null {
  const normalized = normalizePathname(pathname)

  for (const matcher of MATCHERS) {
    if (normalized === matcher.prefix || normalized.startsWith(`${matcher.prefix}/`)) {
      return matcher.routeId
    }
  }

  return null
}

export function getRegisteredHelpContext(routeId: string): HelpContext | null {
  const entry = HELP_BY_ROUTE_ID.get(routeId)
  if (!entry) return null

  return {
    routeId: entry.routeId,
    wikiSlug: entry.wikiSlug,
    roleScopes: entry.roleScopes,
    tourId: entry.tourId,
    fallbackMode: entry.fallbackMode,
  }
}

export function getHelpContext(routeId: string, accountLevel: number): HelpContext | null {
  const entry = HELP_BY_ROUTE_ID.get(routeId)
  if (!entry) return null

  const scopes = getRoleScopesForAccountLevel(accountLevel)
  const isAllowed = entry.roleScopes.some((scope) => scopes.includes(scope))
  if (!isAllowed) return null

  return {
    routeId: entry.routeId,
    wikiSlug: entry.wikiSlug,
    roleScopes: entry.roleScopes,
    tourId: entry.tourId,
    fallbackMode: entry.fallbackMode,
  }
}

export function resolveHelpContext(pathname: string, accountLevel: number): HelpContext {
  const routeId = resolveRouteIdFromPathname(pathname)
  if (!routeId) {
    const fallback = getRegisteredHelpContext(HELP_START_HERE_ROUTE_ID)
    if (!fallback) {
      throw new Error('Missing docs start-here help context registration')
    }
    return fallback
  }

  const context = getHelpContext(routeId, accountLevel)
  if (context) {
    return context
  }

  const fallback = getRegisteredHelpContext(HELP_START_HERE_ROUTE_ID)
  if (!fallback) {
    throw new Error('Missing docs start-here help context registration')
  }
  return fallback
}

export function getLocalHelpFallback(routeId: string): LocalHelpFallback | null {
  return HELP_BY_ROUTE_ID.get(routeId)?.localFallback ?? null
}

export function getAllRegisteredHelpContexts(): HelpContext[] {
  return HELP_REGISTRY.map((entry) => ({
    routeId: entry.routeId,
    wikiSlug: entry.wikiSlug,
    roleScopes: entry.roleScopes,
    tourId: entry.tourId,
    fallbackMode: entry.fallbackMode,
  }))
}
