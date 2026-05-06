import { describe, expect, it } from 'vitest'
import type { ReportTagSummary } from '@sentinel/contracts'
import {
  filterReportMemberTagsForScheduledDuty,
  pairOperationalPresenceSessions,
  presenceSessionOverlapsRange,
  type PresenceSessionInternal,
} from './operational-report-service.js'
import type { OperationalReportCheckinRecord } from '../repositories/operational-report-repository.js'

function checkin(
  id: string,
  memberId: string,
  direction: 'in' | 'out',
  timestamp: string
): OperationalReportCheckinRecord {
  return {
    id,
    memberId,
    direction,
    timestamp: new Date(timestamp),
  }
}

function getSessions(
  sessionsByMember: Map<string, PresenceSessionInternal[]>,
  memberId: string
): PresenceSessionInternal[] {
  return sessionsByMember.get(memberId) ?? []
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

describe('filterReportMemberTagsForScheduledDuty', () => {
  const baseTag = {
    id: 'tag-other',
    name: 'FTS',
    chipVariant: 'solid',
    chipColor: 'blue',
    isPositional: false,
    source: 'direct',
  } satisfies ReportTagSummary
  const ddsTag = {
    id: 'tag-dds',
    name: 'DDS',
    chipVariant: 'solid',
    chipColor: 'green',
    isPositional: true,
    source: 'direct',
  } satisfies ReportTagSummary
  const dutyWatchTag = {
    id: 'tag-duty-watch',
    name: 'Duty Watch',
    chipVariant: 'solid',
    chipColor: 'purple',
    isPositional: true,
    source: 'direct',
  } satisfies ReportTagSummary

  it('hides DDS and Duty Watch positional tags when the member is not scheduled', () => {
    const filtered = filterReportMemberTagsForScheduledDuty(
      [baseTag, ddsTag, dutyWatchTag],
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
