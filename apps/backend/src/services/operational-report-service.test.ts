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
  sortMemberReportRows,
  type DailyPresenceSortableRow,
  type MemberReportSortableRow,
  type PresenceSessionInternal,
  OperationalReportService,
} from './operational-report-service.js'
import type {
  OperationalReportCheckinRecord,
  OperationalReportMemberFilters,
  OperationalReportMemberRecord,
  OperationalReportRepository,
} from '../repositories/operational-report-repository.js'

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

function operationalReportMember(input: {
  id: string
  displayName: string
  rank: string
  firstName: string
  lastName: string
}): OperationalReportMemberRecord {
  return {
    id: input.id,
    serviceNumber: input.id,
    employeeNumber: null,
    displayName: input.displayName,
    rank: input.rank,
    firstName: input.firstName,
    lastName: input.lastName,
    initials: null,
    divisionId: null,
    memberType: 'Class A',
    memberTypeId: null,
    memberStatusId: null,
    status: 'active',
    memberSource: 'internal',
    accountLevel: 'member',
    mustChangePin: false,
    classDetails: null,
    mess: null,
    moc: null,
    email: null,
    homePhone: null,
    mobilePhone: null,
    badgeId: null,
    pinHash: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    division: null,
    memberTypeRef: {
      id: 'member-type-class-a',
      code: 'class_a',
      name: 'Class A',
    },
    memberStatusRef: {
      id: 'member-status-active',
      code: 'active',
      name: 'Active',
    },
    memberTags: [],
    qualifications: [],
  } as unknown as OperationalReportMemberRecord
}

function sortableDailyPresenceRow(input: {
  id: string
  firstName: string
  lastName: string
  rank?: string
  rankOrder?: number
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
      rank: input.rank ?? 'S1',
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `S1 ${input.lastName}, ${input.firstName}`,
      rankRef: typeof input.rankOrder === 'number' ? { displayOrder: input.rankOrder } : undefined,
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
        rank: input.rank ?? 'S1',
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

function sortableWeeklyPresenceRow(input: {
  id: string
  firstName: string
  lastName: string
  totalDaysPresent: number
  totalSessions?: number
}): MemberReportSortableRow {
  return {
    memberRecord: {
      id: input.id,
      rank: 'S1',
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `S1 ${input.lastName}, ${input.firstName}`,
      rankRef: { displayOrder: 3 },
      division: null,
      memberTags: [],
      qualifications: [],
    },
    row: {
      member: {
        id: input.id,
        displayName: `S1 ${input.lastName}, ${input.firstName}`,
        rank: 'S1',
        status: 'Active',
        division: null,
        memberType: 'Class A',
        tags: [],
      },
      days: [],
      trainingNightPresent: null,
      adminNightPresent: null,
      keyNights: [],
      totalDaysPresent: input.totalDaysPresent,
      totalSessions: input.totalSessions ?? input.totalDaysPresent,
    },
  }
}

function sortableTrainingNightMonthlyRow(input: {
  id: string
  firstName: string
  lastName: string
  percentage: number
}): MemberReportSortableRow {
  return {
    memberRecord: {
      id: input.id,
      rank: 'S1',
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `S1 ${input.lastName}, ${input.firstName}`,
      rankRef: { displayOrder: 3 },
      division: null,
      memberTags: [],
      qualifications: [],
    },
    row: {
      member: {
        id: input.id,
        displayName: `S1 ${input.lastName}, ${input.firstName}`,
        rank: 'S1',
        status: 'Active',
        division: null,
        memberType: 'Class A',
        tags: [],
      },
      nights: [],
      attended: input.percentage,
      possible: 100,
      percentage: input.percentage,
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

  it('ignores an unmatched checkout without warning when a check-in follows within five minutes', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'out', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'in', '2026-05-05T08:04:00.000Z'),
        checkin('3', 'member-1', 'out', '2026-05-05T12:00:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.inAt.toISOString()).toBe('2026-05-05T08:04:00.000Z')
    expect(sessions[0]?.outAt?.toISOString()).toBe('2026-05-05T12:00:00.000Z')
    expect(Array.from(warnings)).not.toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
  })

  it('treats a checkout followed by a check-in within five minutes as continuous presence', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'in', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'out', '2026-05-05T10:00:00.000Z'),
        checkin('3', 'member-1', 'in', '2026-05-05T10:03:00.000Z'),
        checkin('4', 'member-1', 'out', '2026-05-05T16:00:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.inAt.toISOString()).toBe('2026-05-05T08:00:00.000Z')
    expect(sessions[0]?.outAt?.toISOString()).toBe('2026-05-05T16:00:00.000Z')
    expect(sessions[0]?.status).toBe('complete')
    expect(warnings.size).toBe(0)
  })

  it('keeps warning for an unmatched checkout when the next check-in is outside five minutes', () => {
    const warnings = new Set<string>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'out', '2026-05-05T08:00:00.000Z'),
        checkin('2', 'member-1', 'in', '2026-05-05T08:06:00.000Z'),
      ],
      warnings
    )

    const sessions = getSessions(sessionsByMember, 'member-1')
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.inAt.toISOString()).toBe('2026-05-05T08:06:00.000Z')
    expect(Array.from(warnings)).toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
  })

  it('tracks affected member IDs for unmatched checkout warnings', () => {
    const warnings = new Set<string>()
    const warningMemberIds = new Map<string, Set<string>>()
    pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'out', '2026-05-05T12:00:00.000Z'),
        checkin('2', 'member-2', 'out', '2026-05-05T12:05:00.000Z'),
      ],
      warnings,
      { warningMemberIds }
    )

    expect(
      Array.from(
        warningMemberIds.get(
          'Some checkout records could not be paired with a prior check-in and were ignored.'
        ) ?? []
      )
    ).toEqual(['member-1', 'member-2'])
  })

  it('suppresses unmatched checkout warnings outside the selected warning range', () => {
    const warnings = new Set<string>()
    const warningMemberIds = new Map<string, Set<string>>()
    const sessionsByMember = pairOperationalPresenceSessions(
      [
        checkin('1', 'member-1', 'out', '2026-06-11T08:00:00.000Z'),
        checkin('2', 'member-1', 'in', '2026-06-12T13:00:00.000Z'),
      ],
      warnings,
      {
        warningMemberIds,
        warningRange: {
          start: new Date('2026-06-12T08:00:00.000Z'),
          end: new Date('2026-06-13T08:00:00.000Z'),
        },
      }
    )

    expect(getSessions(sessionsByMember, 'member-1')).toHaveLength(1)
    expect(Array.from(warnings)).not.toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
    expect(warningMemberIds.size).toBe(0)
  })
})

describe('generateDailyPresence', () => {
  it('includes affected account names for unmatched checkout warnings', async () => {
    const member = operationalReportMember({
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'S1 Example, A',
      rank: 'S1',
      firstName: 'Alex',
      lastName: 'Example',
    })
    const repository = {
      findActiveMembers: async () => [member],
      findCheckinsForMembers: async () => [
        checkin(
          'checkin-1',
          '11111111-1111-4111-8111-111111111111',
          'out',
          '2026-06-12T14:00:00.000Z'
        ),
      ],
      findScheduledDutyAssignmentsForMembers: async () => [],
      findDdsAssignmentsForMembers: async () => [],
      findLiveDutyAssignmentsForMembers: async () => [],
    } as unknown as OperationalReportRepository
    const service = new OperationalReportService(undefined, repository)

    const report = await service.generateDailyPresence(
      { date: '2026-06-12', scopeType: 'everyone' },
      { id: 'actor-1', rank: 'MS', firstName: 'Report', lastName: 'Runner' }
    )

    expect(report.warnings).toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
    expect(report.warningDetails).toEqual([
      {
        message:
          'Some checkout records could not be paired with a prior check-in and were ignored.',
        accounts: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            displayName: 'S1 Example, A',
            division: null,
            memberType: 'Class A',
          },
        ],
      },
    ])
  })

  it('does not warn about unmatched checkouts that only belong to the report lookback', async () => {
    const member = operationalReportMember({
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'S1 Example, A',
      rank: 'S1',
      firstName: 'Alex',
      lastName: 'Example',
    })
    const repository = {
      findActiveMembers: async () => [member],
      findCheckinsForMembers: async () => [
        checkin(
          'checkin-1',
          '11111111-1111-4111-8111-111111111111',
          'out',
          '2026-06-11T08:00:00.000Z',
          'SYSTEM'
        ),
      ],
      findScheduledDutyAssignmentsForMembers: async () => [],
      findDdsAssignmentsForMembers: async () => [],
      findLiveDutyAssignmentsForMembers: async () => [],
    } as unknown as OperationalReportRepository
    const service = new OperationalReportService(undefined, repository)

    const report = await service.generateDailyPresence(
      { date: '2026-06-12', scopeType: 'everyone' },
      { id: 'actor-1', rank: 'MS', firstName: 'Report', lastName: 'Runner' }
    )

    expect(report.warnings).not.toContain(
      'Some checkout records could not be paired with a prior check-in and were ignored.'
    )
    expect(report.warningDetails).toEqual([])
  })
})

describe('generateTrainingNightMonthly', () => {
  it('runs against all selected departments', async () => {
    const adminDivision = {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'ADMIN',
      name: 'Administration',
    }
    const bandDivision = {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'BAND',
      name: 'Band',
    }
    const divisions = new Map([
      [adminDivision.id, adminDivision],
      [bandDivision.id, bandDivision],
    ])
    let activeMemberFilters: OperationalReportMemberFilters | null = null
    const repository = {
      findDivisionById: async (divisionId: string) => divisions.get(divisionId) ?? null,
      findActiveMembers: async (filters: OperationalReportMemberFilters) => {
        activeMemberFilters = filters
        return []
      },
      findCheckinsForMembers: async () => [],
      findUnitEvents: async () => [],
      findAppSettingValue: async () => null,
      findReportSettingValue: async () => null,
    } as unknown as OperationalReportRepository
    const service = new OperationalReportService(undefined, repository)

    const report = await service.generateTrainingNightMonthly(
      {
        month: '2026-06',
        divisionIds: [adminDivision.id, bandDivision.id],
      },
      { id: 'actor-1', rank: 'MS', firstName: 'Report', lastName: 'Runner' }
    )

    expect(activeMemberFilters).toEqual({
      divisionIds: [adminDivision.id, bandDivision.id],
    })
    expect(report.filters.scopeLabel).toBe('Administration, Band')
    expect(report.filters.divisionId).toBe(adminDivision.id)
    expect(report.filters.divisionIds).toEqual([adminDivision.id, bandDivision.id])
    expect(report.data.department).toBeNull()
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

  it('sorts by rank display order before last name', () => {
    const sorted = sortDailyPresenceRows(
      [
        sortableDailyPresenceRow({
          id: 's1-zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
          rank: 'S1',
          rankOrder: 3,
        }),
        sortableDailyPresenceRow({
          id: 'ms-baker',
          firstName: 'Bill',
          lastName: 'Baker',
          rank: 'MS',
          rankOrder: 5,
        }),
        sortableDailyPresenceRow({
          id: 's1-able',
          firstName: 'Ann',
          lastName: 'Able',
          rank: 'S1',
          rankOrder: 3,
        }),
      ],
      [
        { type: 'field', field: 'rank', direction: 'asc' },
        { type: 'field', field: 'last_name', direction: 'asc' },
      ]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual(['s1-able', 's1-zulu', 'ms-baker'])
  })

  it('lets last name direction control equal-rank members when rank is descending', () => {
    const sorted = sortDailyPresenceRows(
      [
        sortableDailyPresenceRow({
          id: 's1-zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
          rank: 'S1',
          rankOrder: 3,
        }),
        sortableDailyPresenceRow({
          id: 'ms-baker',
          firstName: 'Bill',
          lastName: 'Baker',
          rank: 'MS',
          rankOrder: 5,
        }),
        sortableDailyPresenceRow({
          id: 's1-able',
          firstName: 'Ann',
          lastName: 'Able',
          rank: 'S1',
          rankOrder: 3,
        }),
      ],
      [
        { type: 'field', field: 'rank', direction: 'desc' },
        { type: 'field', field: 'last_name', direction: 'asc' },
      ]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual(['ms-baker', 's1-able', 's1-zulu'])
  })

  it('honors descending last name sort direction', () => {
    const sorted = sortDailyPresenceRows(
      [
        sortableDailyPresenceRow({
          id: 'able',
          firstName: 'Ann',
          lastName: 'Able',
        }),
        sortableDailyPresenceRow({
          id: 'baker',
          firstName: 'Bill',
          lastName: 'Baker',
        }),
        sortableDailyPresenceRow({
          id: 'zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
        }),
      ],
      [{ type: 'field', field: 'last_name', direction: 'desc' }]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual(['zulu', 'baker', 'able'])
  })

  it('honors descending first name sort direction', () => {
    const sorted = sortDailyPresenceRows(
      [
        sortableDailyPresenceRow({
          id: 'amy',
          firstName: 'Amy',
          lastName: 'Zulu',
        }),
        sortableDailyPresenceRow({
          id: 'bill',
          firstName: 'Bill',
          lastName: 'Baker',
        }),
        sortableDailyPresenceRow({
          id: 'zed',
          firstName: 'Zed',
          lastName: 'Able',
        }),
      ],
      [{ type: 'field', field: 'first_name', direction: 'desc' }]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual(['zed', 'bill', 'amy'])
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

describe('sortMemberReportRows', () => {
  it('sorts weekly-style attendance rows by days present before last name', () => {
    const sorted = sortMemberReportRows(
      [
        sortableWeeklyPresenceRow({
          id: 'low-zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
          totalDaysPresent: 1,
        }),
        sortableWeeklyPresenceRow({
          id: 'high-baker',
          firstName: 'Bill',
          lastName: 'Baker',
          totalDaysPresent: 4,
        }),
        sortableWeeklyPresenceRow({
          id: 'high-alpha',
          firstName: 'Amy',
          lastName: 'Alpha',
          totalDaysPresent: 4,
        }),
      ],
      [
        { type: 'field', field: 'total_days_present', direction: 'desc' },
        { type: 'field', field: 'last_name', direction: 'asc' },
      ]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual([
      'high-alpha',
      'high-baker',
      'low-zulu',
    ])
  })

  it('lets last name direction control equal-rank weekly rows when rank is descending', () => {
    const sorted = sortMemberReportRows(
      [
        sortableWeeklyPresenceRow({
          id: 's1-zulu',
          firstName: 'Zed',
          lastName: 'Zulu',
          rank: 'S1',
          rankOrder: 3,
        }),
        sortableWeeklyPresenceRow({
          id: 'ms-baker',
          firstName: 'Bill',
          lastName: 'Baker',
          rank: 'MS',
          rankOrder: 5,
        }),
        sortableWeeklyPresenceRow({
          id: 's1-able',
          firstName: 'Ann',
          lastName: 'Able',
          rank: 'S1',
          rankOrder: 3,
        }),
      ],
      [
        { type: 'field', field: 'rank', direction: 'desc' },
        { type: 'field', field: 'last_name', direction: 'asc' },
      ]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual(['ms-baker', 's1-able', 's1-zulu'])
  })

  it('sorts training night monthly rows by attendance percentage', () => {
    const sorted = sortMemberReportRows(
      [
        sortableTrainingNightMonthlyRow({
          id: 'half',
          firstName: 'Hal',
          lastName: 'Half',
          percentage: 50,
        }),
        sortableTrainingNightMonthlyRow({
          id: 'full',
          firstName: 'Faye',
          lastName: 'Full',
          percentage: 100,
        }),
      ],
      [{ type: 'field', field: 'percentage', direction: 'desc' }]
    )

    expect(sorted.map((row) => row.memberRecord.id)).toEqual(['full', 'half'])
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
