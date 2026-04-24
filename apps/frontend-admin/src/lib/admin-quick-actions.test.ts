import { describe, expect, it } from 'vitest'
import {
  addRecentAdminQuickAction,
  composeAdminQuickActionsForDisplay,
  getDefaultPinnedAdminQuickActionIds,
  getAdminQuickActionsByIds,
  normalizeAdminQuickActionIds,
  parseStoredAdminQuickActions,
  serializeStoredAdminQuickActions,
} from './admin-quick-actions'

describe('admin quick actions', () => {
  it('defaults to pinned actions when no stored state exists', () => {
    const state = parseStoredAdminQuickActions(null)

    expect(state.pinned).toEqual(getDefaultPinnedAdminQuickActionIds())
    expect(state.recent).toEqual([])
  })

  it('normalizes invalid and duplicate action ids', () => {
    expect(normalizeAdminQuickActionIds(['open-updates', 'invalid', 'open-updates'])).toEqual([
      'open-updates',
    ])
  })

  it('moves clicked actions to the front of recent actions', () => {
    const state = addRecentAdminQuickAction(
      { pinned: ['open-updates'], recent: ['view-logs'] },
      'add-badge'
    )

    expect(state.recent).toEqual(['add-badge', 'view-logs'])
  })

  it('round-trips stored quick actions through JSON', () => {
    const serialized = serializeStoredAdminQuickActions({
      pinned: ['open-updates'],
      recent: ['view-logs', 'add-badge'],
    })

    expect(parseStoredAdminQuickActions(serialized)).toEqual({
      pinned: ['open-updates'],
      recent: ['view-logs', 'add-badge'],
    })
  })

  it('deduplicates display actions across pinned, recent, and fallback buckets', () => {
    const displayed = composeAdminQuickActionsForDisplay({
      pinned: getAdminQuickActionsByIds(['view-logs']),
      recent: getAdminQuickActionsByIds(['open-updates']),
      fallback: getAdminQuickActionsByIds(['open-updates', 'add-badge', 'view-logs']),
      limit: 6,
    })

    expect(displayed.map((action) => action.id)).toEqual(['view-logs', 'open-updates', 'add-badge'])
  })
})
