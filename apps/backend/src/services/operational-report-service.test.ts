import { describe, expect, it } from 'vitest'
import type { ReportTagSummary } from '@sentinel/contracts'
import {
  compareReportTagsByPriority,
  dailyPresenceSortableMemberHasTag,
  isStaleForcedCheckoutSession,
  filterReportMemberTagsForScheduledDuty,
  pairOperationalPresenceSessions,
  presenceSessionOverlapsRange,
  sortDailyPresenceRows,
  type DailyPresenceSortableRow,
  type PresenceSessionInternal,
} from './operational-report-service.js'
import type { OperationalReportCheckinRecord } from '../repositories/operational-report-repository.js'

function checkin(
  id: string,
  memberId: string,
  direction: 'in' | 'out',
  timestamp: string,
  kioskId = 'front'
): OperationalReportCheckinRecord {
  return {
    id,
    memberId,
    direction,
    timestamp: new Date(timestamp),
    kioskId,
  }
}

function getSessions(
  sessionsByMember: Map<string, PresenceSessionInternal[]>,
  memberId: string
): PresenceSessionInternal[] {
  return sessionsByMember.get(memberId) ?? []
}

function sortableDailyPresenceRow(input: {
  id: string
  firstName: string
  lastName: string
  tags?: string[]
  qualificationTags?: string[]
  reportTags?: ReportTagSummary[]
  department?: string
  sessionCount?: number
}): DailyPresenceSortableRow {
  const tags = input.tags ?? []
  const qualificationTags = input.qualificationTags ?? []
  const reportTags = input.reportTags ?? []

  return {
    memberRecord: {
      id: input.id,
      rank: 'S1',
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `S1 ${input.lastName}, ${input.firstName}`,
      division: input.department ? { code: input.department, name: input.department } : null,
      memberTags: tags.map((tagId) => ({ tagId })),
      qualifications: qualificationTags.map((tagId) => ({
        qualificationType: { tagId },
      })),
    },
    row: {
      member: {
        id: input.id,
        displayName: `S1 ${input.lastName}, ${input.firstName}`,
        rank: 'S1',
        status: 'Active',
        division: input.department
          ? { id: input.department, code: input.department, name: input.department }
          : null,
        memberType: 'Class A',
        tags: reportTags,
      },
      firstIn: '2026-06-11T13:00:00.000Z',
      lastOut: null,
      sessionCount: input.sessionCount ?? 1,
      leftAndReturned: false,
      sessions: [],
    },
  }
}

describe('pairOperationalPresenceSessions', () => {
  it('pairs each check-in with the next valid checkout for the same member', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'in', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'out', '2026-05-05T12:00:00.000Z'),
        checkin('3', 'member-1', 'in', '2026-05-05T13:00:00.000Z'),
        checkin('4', 'member-1', 'out', '2026-05-05T16:00:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(2)
    expect(sessions.map((session) => session.status)).toEqual(['complete', 'complete'])
    expect(sessions[0]?.inAt.toISOString()).toBe('2026-05-05T08:00:00.000Z')
    expect(sessions[0]?.outAt?.toISOString()).toBe('2026-05-05T12:00:00.000Z')
    expect(warnings.size).toBe(0)
  })

  it('carries checkout kiosk IDs on completed sessions', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'in', '2026-05-05T23:00:00.000Z'),
        checkin('2', 'member-1', 'out', '2026-05-06T13:24:00.000Z', 'lockup-force-checkout'),
      ],
      warnings
    )

    expect(getSessions(sessionsByMember, 'member-1')[0]?.checkoutKioskId).toBe(
      'lockup-force-checkout'
    )
  })

  it('marks repeated check-ins without checkout as degraded and keeps the latest session open', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'in', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'in', '2026-05-05T09:00:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(2)
    expect(sessions.map((session) => session.status)).toEqual(['degraded', 'open'])
    expect(sessions[0]?.outAt).toBeNull()
    expect(Array.from(warnings)).toContain(
      'Some members have multiple check-ins without an intervening checkout; affected sessions are marked as degraded.'
    )
  })

  it('warns and ignores unmatched checkouts', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [checkin('1', 'member-1', 'out', '2026-05-05T12:00:00.000Z')],
      warnings
    )

    expect(getSessions(sessionsByMember, 'member-1')).toHaveLength(0)
    expect(Array.from(warnings)).toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
  })
})

describe('isStaleForcedCheckoutSession', () => {
  it('identifies prior-day sessions closed by lockup after the report day started', () => {
    expect(
      isStaleForcedCheckoutSession(
        {
          memberId: 'member-1',
          inAt: new Date('2026-05-05T23:00:00.000Z'),
          outAt: new Date('2026-05-06T13:24:00.000Z'),
          status: 'complete',
          checkoutKioskId: 'lockup-force-checkout',
        },
        new Date('2026-05-06T08:00:00.000Z')
      )
    ).toBe(true)
  })

  it('keeps normal sessions that began before the report day and checked out normally', () => {
    expect(
      isStaleForcedCheckoutSession(
        {
          memberId: 'member-1',
          inAt: new Date('2026-05-05T23:00:00.000Z'),
          outAt: new Date('2026-05-06T13:24:00.000Z'),
          status: 'complete',
          checkoutKioskId: 'front',
        },
        new Date('2026-05-06T08:00:00.000Z')
      )
    ).toBe(false)
  })
})

describe('presenceSessionOverlapsRange', () => {
  const openSession: PresenceSessionInternal = {
    memberId: 'member-1',
    inAt: new Date('2026-05-05T23:00:00.000Z'),
    outAt: null,
    status: 'open',
  }
  const asOf = new Date('2026-05-06T14:23:00.000Z')

  it('keeps open sessions present through the report generation time', () => {
    expect(
      presenceSessionOverlapsRange(
        openSession,
        new Date('2026-05-06T05:00:00.000Z'),
        new Date('2026-05-07T05:00:00.000Z'),
        asOf
      )
    ).toBe(true)
  })

  it('does not extend open sessions into future report days', () => {
    expect(
      presenceSessionOverlapsRange(
        openSession,
        new Date('2026-05-07T05:00:00.000Z'),
        new Date('2026-05-08T05:00:00.000Z'),
        asOf
      )
    ).toBe(false)
  })

  it('ignores sessions that start after the report generation time', () => {
    expect(
      presenceSessionOverlapsRange(
        {
          memberId: 'member-1',
          inAt: new Date('2026-05-06T18:00:00.000Z'),
          outAt: null,
          status: 'open',
        },
        new Date('2026-05-06T05:00:00.000Z'),
        new Date('2026-05-07T05:00:00.000Z'),
        asOf
      )
    ).toBe(false)
  })
})

describe('sortDailyPresenceRows', () => {
  const cmdTagId = '11111111-1111-4111-8111-111111111111'
  const ftsTagId = '22222222-2222-4222-8222-222222222222'
  const cmdReportTag = {
    id: cmdTagId,
    name: 'CMD',
    displayOrder: 10,
    chipVariant: 'solid',
    chipColor: 'blue',
    isPositional: false,
    source: 'direct',
  } satisfies ReportTagSummary
  const ftsReportTag = {
    id: ftsTagId,
    name: 'FTS',
    displayOrder: 20,
    chipVariant: 'solid',
    chipColor: 'green',
    isPositional: false,
    source: 'direct',
  } satisfies ReportTagSummary
  const adminReportTag = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Admin',
    displayOrder: 40,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: false,
    source: 'direct',
  } satisfies ReportTagSummary

  it('sorts by selected tag priorities before last name', () => {
    const sorted = sortDailyPresenceRows(
      [
        sortableDailyPresenceRow({
          id: 'reserve-zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
        }),
        sortableDailyPresenceRow({
          id: 'fts-alpha',
          firstName: 'Amy',
          lastName: 'Alpha',
          tags: [ftsTagId],
        }),
        sortableDailyPresenceRow({
          id: 'cmd-smith',
          firstName: 'Sam',
          lastName: 'Smith',
          tags: [cmdTagId],
        }),
        sortableDailyPresenceRow({
          id: 'fts-baker',
          firstName: 'Bill',
          lastName: 'Baker',
          tags: [ftsTagId],
        }),
        sortableDailyPresenceRow({
          id: 'reserve-able',
          firstName: 'Ann',
          lastName: 'Able',
        }),
      ],
      [
        { type: 'tag', tagId: cmdTagId, direction: 'asc' },
        { type: 'tag', tagId: ftsTagId, direction: 'asc' },
        { type: 'field', field: 'last_name', direction: 'asc' },
      ]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual([
      'cmd-smith',
      'fts-alpha',
      'fts-baker',
      'reserve-able',
      'reserve-zulu',
    ])
  })

  it('matches qualification-backed tags when sorting by tag priority', () => {
    const member = sortableDailyPresenceRow({
      id: 'qualified',
      firstName: 'Quinn',
      lastName: 'Qualified',
      qualificationTags: [ftsTagId],
    }).memberRecord

    expect(dailyPresenceSortableMemberHasTag(member, ftsTagId)).toBe(true)
  })

  it('sorts by configured tag priority before last name', () => {
    const sorted = sortDailyPresenceRows(
      [
        sortableDailyPresenceRow({
          id: 'untagged-able',
          firstName: 'Ann',
          lastName: 'Able',
        }),
        sortableDailyPresenceRow({
          id: 'fts-zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
          reportTags: [ftsReportTag],
        }),
        sortableDailyPresenceRow({
          id: 'cmd-baker',
          firstName: 'Bill',
          lastName: 'Baker',
          reportTags: [cmdReportTag],
        }),
        sortableDailyPresenceRow({
          id: 'cmd-alpha',
          firstName: 'Amy',
          lastName: 'Alpha',
          reportTags: [cmdReportTag],
        }),
        sortableDailyPresenceRow({
          id: 'admin-carter',
          firstName: 'Cara',
          lastName: 'Carter',
          reportTags: [adminReportTag],
        }),
      ],
      [
        { type: 'tag_priority', direction: 'asc' },
        { type: 'field', field: 'last_name', direction: 'asc' },
      ]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual([
      'cmd-alpha',
      'cmd-baker',
      'fts-zulu',
      'admin-carter',
      'untagged-able',
    ])
  })
})

describe('filterReportMemberTagsForScheduledDuty', () => {
  const baseTag = {
    id: 'tag-other',
    name: 'FTS',
    displayOrder: 20,
    chipVariant: 'solid',
    chipColor: 'blue',
    isPositional: false,
    source: 'direct',
  } satisfies ReportTagSummary
  const ddsTag = {
    id: 'tag-dds',
    name: 'DDS',
    displayOrder: 10,
    chipVariant: 'solid',
    chipColor: 'green',
    isPositional: true,
    source: 'direct',
  } satisfies ReportTagSummary
  const dutyWatchTag = {
    id: 'tag-duty-watch',
    name: 'Duty Watch',
    displayOrder: 30,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: true,
    source: 'direct',
  } satisfies ReportTagSummary
  const qmTag = {
    id: 'tag-qm',
    name: 'QM',
    displayOrder: 40,
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: false,
    source: 'qualification',
  } satisfies ReportTagSummary

  it('hides DDS and Duty Watch positional tags when the member is not scheduled', () => {
    const filtered = filterReportMemberTagsForScheduledDuty(
      [baseTag, ddsTag, dutyWatchTag, qmTag],
      new Set()
    )

    expect(filtered).toEqual([baseTag])
  })

  it('keeps each positional tag when the member is scheduled for that duty role', () => {
    const filtered = filterReportMemberTagsForScheduledDuty(
      [baseTag, ddsTag, dutyWatchTag],
      new Set(['DDS', 'DUTY_WATCH'])
    )

    expect(filtered).toEqual([baseTag, ddsTag, dutyWatchTag])
  })

  it('keeps a Duty Watch position tag only when scheduled or acted in that position', () => {
    expect(filterReportMemberTagsForScheduledDuty([qmTag], new Set(['QM']))).toEqual([qmTag])
    expect(filterReportMemberTagsForScheduledDuty([qmTag], new Set(['SWK']))).toEqual([])
  })

  it('hides all DDS and Duty Watch family tags when monthly reports request it', () => {
    const filtered = filterReportMemberTagsForScheduledDuty(
      [baseTag, ddsTag, dutyWatchTag, qmTag],
      new Set(['DDS', 'DUTY_WATCH', 'QM']),
      { hideDutyTags: true }
    )

    expect(filtered).toEqual([baseTag])
  })

  it('does not hide non-positional tags with similar names', () => {
    const qualificationTag = {
      ...ddsTag,
      id: 'tag-dds-qualified',
      name: 'DDS Qualified',
      isPositional: false,
    } satisfies ReportTagSummary

    expect(filterReportMemberTagsForScheduledDuty([qualificationTag], new Set())).toEqual([
      qualificationTag,
    ])
  })
})

describe('compareReportTagsByPriority', () => {
  it('orders report tags by configured display order before name', () => {
    const lowPriorityAlphabeticFirst = {
      id: 'tag-admin',
      name: 'Admin',
      displayOrder: 30,
      chipVariant: 'solid',
      chipColor: 'blue',
      isPositional: false,
      source: 'direct',
    } satisfies ReportTagSummary
    const highPriorityAlphabeticLast = {
      id: 'tag-fts',
      name: 'FTS',
      displayOrder: 10,
      chipVariant: 'solid',
      chipColor: 'green',
      isPositional: false,
      source: 'direct',
    } satisfies ReportTagSummary

    expect(
      [lowPriorityAlphabeticFirst, highPriorityAlphabeticLast]
        .sort(compareReportTagsByPriority)
        .map((tag) => tag.name)
    ).toEqual(['FTS', 'Admin'])
  })

  it('falls back to tag name when display order matches', () => {
    const bravoTag = {
      id: 'tag-bravo',
      name: 'Bravo',
      displayOrder: 10,
      chipVariant: 'solid',
      chipColor: 'blue',
      isPositional: false,
      source: 'direct',
    } satisfies ReportTagSummary
    const alphaTag = {
      id: 'tag-alpha',
      name: 'Alpha',
      displayOrder: 10,
      chipVariant: 'solid',
      chipColor: 'green',
      isPositional: false,
      source: 'direct',
    } satisfies ReportTagSummary

    expect([bravoTag, alphaTag].sort(compareReportTagsByPriority).map((tag) => tag.name)).toEqual([
      'Alpha',
      'Bravo',
    ])
  })
})
