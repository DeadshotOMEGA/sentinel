import { describe, expect, it } from 'vitest'
import { formatAssignedMemberName, matchesBadgeSearch } from './badge-search.js'
import type { BadgeWithDetails } from '@sentinel/types'

function createBadge(overrides: Partial<BadgeWithDetails> = {}): BadgeWithDetails {
  return {
    id: 'badge-1',
    serialNumber: 'TEST-BADGE-0089',
    assignmentType: 'member',
    assignedToId: 'member-1',
    status: 'active',
    createdAt: new Date('2026-03-26T00:00:00.000Z'),
    updatedAt: new Date('2026-03-26T00:00:00.000Z'),
    assignedMember: {
      id: 'member-1',
      firstName: 'Walter',
      lastName: 'Montgomery',
      rank: 'Sgt',
      initials: 'WI',
      displayName: 'Sgt Montgomery, WI',
      serviceNumber: 'B29215100',
    },
    ...overrides,
  }
}

describe('badge-search helpers', () => {
  it('matches badge search against member display name and service number', () => {
    const badge = createBadge()

    expect(matchesBadgeSearch(badge, 'Montgomery')).toBe(true)
    expect(matchesBadgeSearch(badge, 'sgt montgomery, wi')).toBe(true)
    expect(matchesBadgeSearch(badge, 'B29215100')).toBe(true)
  })

  it('matches badge search against serial number', () => {
    const badge = createBadge({ assignedMember: undefined, assignmentType: 'unassigned' })

    expect(matchesBadgeSearch(badge, '0089')).toBe(true)
    expect(matchesBadgeSearch(badge, 'missing')).toBe(false)
  })

  it('prefers display name when formatting assigned member names', () => {
    const badge = createBadge()

    expect(formatAssignedMemberName(badge.assignedMember!)).toBe('Sgt Montgomery, WI')
  })
})
