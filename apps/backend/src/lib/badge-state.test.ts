import { describe, expect, it } from 'vitest'
import {
  getBadgeStatusSummary,
  hasValidMemberBadgeAssignment,
  normalizeBadgeAssignmentType,
} from './badge-state.js'

describe('badge-state helpers', () => {
  it('normalizes legacy permanent assignments to member', () => {
    expect(normalizeBadgeAssignmentType('permanent')).toBe('member')
    expect(normalizeBadgeAssignmentType('member')).toBe('member')
  })

  it('maps badge status to display metadata from badge.status', () => {
    expect(getBadgeStatusSummary('active')).toEqual({
      name: 'Active',
      chipVariant: 'bordered',
      chipColor: 'success',
    })

    expect(getBadgeStatusSummary('lost')).toEqual({
      name: 'Lost',
      chipVariant: 'bordered',
      chipColor: 'warning',
    })
  })

  it('only treats a badge as valid for a member when assignment matches the member id', () => {
    expect(hasValidMemberBadgeAssignment('member', 'member-1', 'member-1')).toBe(true)
    expect(hasValidMemberBadgeAssignment('permanent', 'member-1', 'member-1')).toBe(true)
    expect(hasValidMemberBadgeAssignment('member', 'member-2', 'member-1')).toBe(false)
    expect(hasValidMemberBadgeAssignment('visitor', 'member-1', 'member-1')).toBe(false)
  })
})
