import { describe, expect, it } from 'vitest'
import {
  applyDashboardPersonCardSort,
  parseDashboardPersonCardSort,
  type DashboardPersonCardSortConfig,
} from './dashboard-person-card-sort'

const baseMembers = [
  {
    id: 'member-a',
    type: 'member' as const,
    name: 'PO2 Able',
    displayName: 'Able, Alex',
    rank: 'PO2',
    firstName: 'Alex',
    lastName: 'Able',
    rankSortOrder: 5,
    tags: [
      { id: 'tag-cmd', name: 'CMD', source: 'direct' as const },
      { id: 'tag-pos', name: 'QM', isPositional: true, source: 'qualification' as const },
    ],
    checkInTime: '2026-04-01T11:00:00.000Z',
  },
  {
    id: 'member-b',
    type: 'member' as const,
    name: 'S1 Baker',
    displayName: 'Baker, Blair',
    rank: 'S1',
    firstName: 'Blair',
    lastName: 'Baker',
    rankSortOrder: 2,
    tags: [],
    checkInTime: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'visitor-c',
    type: 'visitor' as const,
    name: 'Casey Visitor',
    displayName: 'Casey Visitor',
    visitType: {
      id: 'visit-contractor',
      name: 'Contractor',
    },
    checkInTime: '2026-04-01T09:00:00.000Z',
  },
]

describe('dashboard person card sort', () => {
  it('falls back to the legacy dashboard ordering when no config exists', () => {
    const sorted = applyDashboardPersonCardSort(baseMembers, null, {
      activeDdsMemberId: null,
      scheduledDdsMemberId: null,
    })

    expect(sorted.map((person) => person.id)).toEqual(['visitor-c', 'member-a', 'member-b'])
  })

  it('sorts a specific tag bucket using nested rank and name rules', () => {
    const config: DashboardPersonCardSortConfig = {
      version: 1,
      criteria: [
        {
          id: 'criterion-1',
          type: 'specific_tag',
          note: 'Command team first',
          config: { tagId: 'tag-cmd' },
          children: [
            {
              id: 'criterion-1-rank',
              type: 'rank',
              note: '',
              children: [],
            },
            {
              id: 'criterion-1-last',
              type: 'last_name',
              note: '',
              children: [],
            },
          ],
        },
      ],
    }

    const sorted = applyDashboardPersonCardSort(baseMembers, config, {
      activeDdsMemberId: null,
      scheduledDdsMemberId: null,
    })

    expect(sorted.map((person) => person.id)).toEqual(['member-a', 'member-b', 'visitor-c'])
  })

  it('parses valid config payloads and rejects malformed ones', () => {
    expect(
      parseDashboardPersonCardSort({
        version: 1,
        criteria: [
          {
            id: 'criterion-1',
            type: 'rank',
            note: '',
            children: [],
          },
        ],
      })
    ).toEqual({
      version: 1,
      criteria: [
        {
          id: 'criterion-1',
          type: 'rank',
          note: '',
          children: [],
          config: undefined,
        },
      ],
    })

    expect(parseDashboardPersonCardSort({ version: 2, criteria: [] })).toBeNull()
  })
})
