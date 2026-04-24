import { ADMIN_QUICK_ACTIONS, type AdminQuickAction, type AdminQuickActionId } from './admin-routes'

export const ADMIN_QUICK_ACTION_STORAGE_KEY = 'sentinel-admin-quick-actions-v1'
export const ADMIN_QUICK_ACTION_RECENT_LIMIT = 4

export interface StoredAdminQuickActions {
  pinned: readonly AdminQuickActionId[]
  recent: readonly AdminQuickActionId[]
}

const VALID_ACTION_IDS = new Set<AdminQuickActionId>(ADMIN_QUICK_ACTIONS.map((action) => action.id))

export function getDefaultPinnedAdminQuickActionIds(): readonly AdminQuickActionId[] {
  return ADMIN_QUICK_ACTIONS.filter((action) => action.defaultPinned).map((action) => action.id)
}

export function normalizeAdminQuickActionIds(
  values: readonly string[]
): readonly AdminQuickActionId[] {
  const seen = new Set<AdminQuickActionId>()
  const normalized: AdminQuickActionId[] = []

  for (const value of values) {
    if (!VALID_ACTION_IDS.has(value as AdminQuickActionId)) {
      continue
    }

    const actionId = value as AdminQuickActionId
    if (seen.has(actionId)) {
      continue
    }

    seen.add(actionId)
    normalized.push(actionId)
  }

  return normalized
}

export function parseStoredAdminQuickActions(rawValue: string | null): StoredAdminQuickActions {
  if (!rawValue) {
    return {
      pinned: getDefaultPinnedAdminQuickActionIds(),
      recent: [],
    }
  }

  try {
    const parsed: unknown = JSON.parse(rawValue)

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Stored quick action state is not an object')
    }

    const record = parsed as Record<string, unknown>
    const pinned = Array.isArray(record.pinned) ? record.pinned : []
    const recent = Array.isArray(record.recent) ? record.recent : []

    return {
      pinned: normalizeAdminQuickActionIds(pinned.filter((value) => typeof value === 'string')),
      recent: normalizeAdminQuickActionIds(
        recent.filter((value) => typeof value === 'string')
      ).slice(0, ADMIN_QUICK_ACTION_RECENT_LIMIT),
    }
  } catch {
    return {
      pinned: getDefaultPinnedAdminQuickActionIds(),
      recent: [],
    }
  }
}

export function serializeStoredAdminQuickActions(state: StoredAdminQuickActions): string {
  return JSON.stringify({
    pinned: normalizeAdminQuickActionIds(state.pinned),
    recent: normalizeAdminQuickActionIds(state.recent).slice(0, ADMIN_QUICK_ACTION_RECENT_LIMIT),
  })
}

export function addRecentAdminQuickAction(
  state: StoredAdminQuickActions,
  actionId: AdminQuickActionId
): StoredAdminQuickActions {
  const recent = normalizeAdminQuickActionIds([
    actionId,
    ...state.recent.filter((item) => item !== actionId),
  ]).slice(0, ADMIN_QUICK_ACTION_RECENT_LIMIT)

  return {
    pinned: normalizeAdminQuickActionIds(state.pinned),
    recent,
  }
}

export function getAdminQuickActionsByIds(
  ids: readonly AdminQuickActionId[]
): readonly AdminQuickAction[] {
  const quickActions: readonly AdminQuickAction[] = ADMIN_QUICK_ACTIONS

  return ids.flatMap((id) => quickActions.find((action) => action.id === id) ?? [])
}

export function composeAdminQuickActionsForDisplay({
  pinned,
  recent,
  fallback,
  limit,
}: {
  pinned: readonly AdminQuickAction[]
  recent: readonly AdminQuickAction[]
  fallback: readonly AdminQuickAction[]
  limit: number
}): readonly AdminQuickAction[] {
  const seen = new Set<AdminQuickActionId>()
  const displayed: AdminQuickAction[] = []

  for (const action of [...pinned, ...recent, ...fallback]) {
    if (seen.has(action.id)) {
      continue
    }

    seen.add(action.id)
    displayed.push(action)

    if (displayed.length >= limit) {
      break
    }
  }

  return displayed
}
